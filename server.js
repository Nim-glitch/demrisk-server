
const express = require('express');
const app = express();
app.use(express.json());

const tools = [{
  name: "compute_dementia_risk",
  description: "Computes dementia risk score from patient medical data",
  inputSchema: {
    type: "object",
    properties: {
      patient_data: { type: "string", description: "Patient medical data text" }
    },
    required: ["patient_data"]
  }
}];

app.get('/mcp', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.write(`data: ${JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" })}\n\n`);
});

app.post('/mcp', async (req, res) => {
  const { method, params, id } = req.body;

  if (method === 'initialize') {
    return res.json({ jsonrpc: "2.0", id, result: {
      protocolVersion: "2024-11-05",
      capabilities: { tools: {} },
      serverInfo: { name: "demrisk-server", version: "1.0.0" }
    }});
  }

  if (method === 'tools/list') {
    return res.json({ jsonrpc: "2.0", id, result: { tools } });
  }

  if (method === 'tools/call') {
    const patientData = params?.arguments?.patient_data || JSON.stringify(params?.arguments || {});
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'You are Demrisk, a clinical decision support agent. Compute a dementia risk score from 0-100 based on patient data. Return exactly: DEMENTIA RISK SCORE: [0-100] | RISK CATEGORY: [Low/Moderate/High] | KEY RISK FACTORS: [top 3] | RECOMMENDATION: [one sentence] | DISCLAIMER: For clinical decision support only.' },
          { role: 'user', content: patientData }
        ]
      })
    });
    const data = await response.json();
    const result = data.choices[0].message.content;
    return res.json({ jsonrpc: "2.0", id, result: {
      content: [{ type: "text", text: result }]
    }});
  }

  res.json({ jsonrpc: "2.0", id, error: { code: -32601, message: "Method not found" }});
});

app.get('/', (req, res) => res.send('Demrisk MCP Server running'));
app.listen(3000, () => console.log('Running'));
