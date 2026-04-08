const express = require('express');
const app = express();
app.use(express.json());

app.post('/tools/demrisk', async (req, res) => {
  const patientData = req.body.patient_data || req.body.input || JSON.stringify(req.body);
  
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are Demrisk, a clinical decision support agent. Compute a dementia risk score from 0-100 based on patient data. Return exactly: DEMENTIA RISK SCORE: [0-100] | RISK CATEGORY: [Low/Moderate/High] | KEY RISK FACTORS: [top 3] | RECOMMENDATION: [one sentence] | DISCLAIMER: For clinical decision support only.`
        },
        { role: 'user', content: patientData }
      ]
    })
  });
  
  const data = await response.json();
  res.json({ result: data.choices[0].message.content });
});

app.get('/', (req, res) => res.send('Demrisk MCP Server running'));
app.listen(3000, () => console.log('Running'));
