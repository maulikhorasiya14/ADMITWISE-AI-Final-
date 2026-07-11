import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Need service role to bypass RLS

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Loading CSV...');
  const records = [];
  const csvPath = path.resolve(__dirname, '../../../data/merged_jee_cutoff_2018_2025.csv');
  
  const parser = fs.createReadStream(csvPath).pipe(
    parse({
      columns: true,
      skip_empty_lines: true
    })
  );

  for await (const record of parser) {
    records.push(record);
  }
  
  console.log(`Loaded ${records.length} records from CSV.`);

  // 1. Get or Create a Source
  const { data: sources, error: sourceErr } = await supabase
    .from('sources')
    .select('id')
    .limit(1);
  
  if (sourceErr) throw sourceErr;
  
  let sourceId = sources?.[0]?.id;
  if (!sourceId) {
    const { data: newSource, error: newSourceErr } = await supabase
      .from('sources')
      .insert({
        title: 'JoSAA Cutoffs 2018-2025 Import',
        source_type: 'counselling_authority',
        source_url: 'https://josaa.nic.in',
        academic_year: '2025-2026',
        verification_status: 'published',
        confidence_level: 'A'
      })
      .select()
      .single();
    if (newSourceErr) throw newSourceErr;
    sourceId = newSource.id;
  }
  console.log('Using source_id:', sourceId);

  // 2. Map Colleges
  const { data: dbColleges, error: collErr } = await supabase.from('colleges').select('id, name, slug');
  if (collErr) throw collErr;
  
  const collegeNameMap = new Map();
  for (const coll of dbColleges) {
    collegeNameMap.set(coll.name, coll.id);
  }

  // 3. Delete existing JoSAA cutoffs to avoid duplication
  console.log('Deleting existing JoSAA cutoff records...');
  const { error: delErr } = await supabase
    .from('cutoff_records')
    .delete()
    .eq('counselling_system', 'JoSAA');
  if (delErr) console.log('Delete error (might be fine if none existed):', delErr.message);

  // Process unique colleges and branches
  const uniqueColleges = new Set();
  const uniqueBranches = new Map(); // branchName -> true

  for (const row of records) {
    uniqueColleges.add(row['Institute']);
    const branchKey = `${row['Institute']}___${row['Academic Program Name']}`;
    uniqueBranches.set(branchKey, {
      collegeName: row['Institute'],
      branchName: row['Academic Program Name']
    });
  }

  console.log(`Found ${uniqueColleges.size} unique colleges and ${uniqueBranches.size} unique branches in CSV.`);

  // Insert missing colleges
  for (const institute of uniqueColleges) {
    if (!collegeNameMap.has(institute)) {
      console.log(`Inserting missing college: ${institute}`);
      const slug = institute.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const { data: newColl, error: insCollErr } = await supabase
        .from('colleges')
        .insert({
          name: institute,
          slug: slug,
          ownership: 'GOVERNMENT',
          city: 'Unknown',
          state: 'Unknown',
          is_published: true
        })
        .select()
        .single();
      if (insCollErr) {
        console.error('Error inserting college', institute, insCollErr.message);
      } else {
        collegeNameMap.set(institute, newColl.id);
      }
    }
  }

  // Fetch all branches
  const { data: dbBranches, error: branchErr } = await supabase.from('college_branches').select('id, college_id, name');
  if (branchErr) throw branchErr;

  const branchMap = new Map(); // key: "collegeId___branchName" -> branchId
  for (const b of dbBranches) {
    branchMap.set(`${b.college_id}___${b.name}`, b.id);
  }

  // Insert missing branches
  for (const [key, branchInfo] of uniqueBranches.entries()) {
    const collegeId = collegeNameMap.get(branchInfo.collegeName);
    const mapKey = `${collegeId}___${branchInfo.branchName}`;
    if (!branchMap.has(mapKey)) {
      // Create branch
      const { data: newBranch, error: newBranchErr } = await supabase
        .from('college_branches')
        .insert({
          college_id: collegeId,
          name: branchInfo.branchName,
          degree: 'B.Tech',
          duration_years: 4,
          source_id: sourceId,
          verification_status: 'published',
          confidence_level: 'A'
        })
        .select()
        .single();
      
      if (newBranchErr) {
        console.error('Error inserting branch', branchInfo.branchName, newBranchErr.message);
      } else {
        branchMap.set(mapKey, newBranch.id);
      }
    }
  }

  // 4. Batch insert cutoffs
  console.log('Inserting cutoff records...');
  
  const cutoffsToInsert = [];
  for (const row of records) {
    const collegeId = collegeNameMap.get(row['Institute']);
    const mapKey = `${collegeId}___${row['Academic Program Name']}`;
    const branchId = branchMap.get(mapKey);

    if (!branchId) {
      console.warn('Missing branch ID for', row['Academic Program Name']);
      continue;
    }

    const isIIT = row['Institute'].includes('Indian Institute of Technology') && !row['Institute'].includes('Information Technology');
    const examName = isIIT ? 'JEE Advanced' : 'JEE Main';

    const opRank = parseFloat(row['Opening Rank']);
    const clRank = parseFloat(row['Closing Rank']);

    cutoffsToInsert.push({
      college_id: collegeId,
      branch_id: branchId,
      exam: examName,
      year: parseInt(row['Year']),
      admission_year: parseInt(row['Year']),
      counselling_system: 'JoSAA',
      round: row['Round'],
      category: row['Seat Type'],
      quota: row['Quota'],
      gender_pool: row['Gender'],
      opening_rank: isNaN(opRank) ? null : opRank,
      closing_rank: isNaN(clRank) ? 0 : clRank,
      source_id: sourceId,
      verification_status: 'published',
      publication_status: 'published',
      confidence_level: 'A'
    });
  }

  const batchSize = 1000;
  for (let i = 0; i < cutoffsToInsert.length; i += batchSize) {
    const batch = cutoffsToInsert.slice(i, i + batchSize);
    const { error: insertErr } = await supabase
      .from('cutoff_records')
      .insert(batch);
    if (insertErr) {
      console.error('Error inserting batch at index', i, insertErr.message);
    } else {
      console.log(`Inserted batch ${i} to ${i + batchSize}`);
    }
  }

  console.log('Done!');
}

run().catch(console.error);
