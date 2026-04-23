export async function generateStudyPlan(apiKey: string, weakSubjects: string[], examDate: string, dailyHours: number) {
  if (!apiKey || weakSubjects.length === 0 || !examDate) {
    throw new Error('Please fill all required fields and provide an API key.');
  }

  const prompt = `You are a GATE CS exam coach. Generate a detailed day-by-day study plan in JSON format for the next 7 days.
  The student has weak subjects: ${weakSubjects.join(', ')}.
  Exam Date: ${examDate}.
  Available daily study hours: ${dailyHours} hours.
  
  Return ONLY valid JSON in this structure:
  {
    "plan": [
      {
        "day": 1,
        "focus": "Subject Name",
        "tasks": ["Task 1", "Task 2"]
      }
    ]
  }`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true' // Required for client-side fetch to Anthropic
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022', // Updated to a valid model since sonnet-4 doesn't exist yet
        max_tokens: 1500,
        system: "You are a GATE CS exam coach. Generate ONLY JSON.",
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`API Error: ${response.status} - ${err}`);
    }

    const data = await response.json();
    const textContent = data.content[0].text;
    
    // Attempt to extract JSON if Claude added markdown
    const jsonMatch = textContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return JSON.parse(textContent);

  } catch (err) {
    console.error('AI Gen error', err);
    throw err;
  }
}
