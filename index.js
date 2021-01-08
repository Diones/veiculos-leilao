const express = require('express');
const morgan = require("morgan");
const { logger, loggerStream } = require('./logger')
const { veiculosProxy, FilterOpts } = require('./veiculos-proxy')

const PORT = 3000;

if (process.env.NODE_ENV === 'production') {
    logger.level = 'error';
}

const app = express();
app.use(morgan('short', { stream: loggerStream }))

app.post('/veiculos', veiculosProxy());
app.get('/veiculos', veiculosProxy({ filter: FilterOpts.QUERY_PARAM, sorting: true }));
app.put('/veiculos/:veiculoId([0-9]+)', veiculosProxy());
app.delete('/veiculos/:veiculoId([0-9]+)', veiculosProxy());
app.get('/veiculos/:veiculoId([0-9]+)', veiculosProxy({ filter: FilterOpts.BY_ID }));

app.listen(PORT);

logger.info(`Application started! Port: ${PORT}`)