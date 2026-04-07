
const express = require('express');
const app = express();
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.post('/device/data', (req, res) => {
    console.log('Data received:', req.body);
    res.json({ received: true });
});
app.get('/', (req, res) => res.send('eVida backend running'));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log('Server running on port ' + port));
