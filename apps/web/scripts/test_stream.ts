const payload = {
  question: "I'm really into robotics and motorsports. Are there active clubs for this at NIT Warangal or IIT Madras?",
  history: [],
  recommendationCollegeIds: [],
  recommendationRecords: []
};

async function testStream() {
  console.log("Sending POST request to http://localhost:3000/api/counsellor/stream...");
  const res = await fetch("http://localhost:3000/api/counsellor/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const reader = res.body?.getReader();
  const decoder = new TextDecoder();
  let done = false;
  
  console.log("Stream started:");
  while (!done && reader) {
    const { value, done: isDone } = await reader.read();
    done = isDone;
    if (value) {
      console.log(decoder.decode(value));
    }
  }
}

testStream().catch(console.error);
