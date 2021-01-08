var proxy = require('express-http-proxy');
const { logger } = require('./logger');
var moment = require('moment');

const ErrorCode = {
    VEHICLE_NOT_FOUND: { code: "404.001", message: "Vehicle not found" },
    METHOD_NOT_SUPPORTED: { code: "405.001", message: "Method not supported" },
    GENERIC_ERROR: { code: "422.001", message: "Contact Support" },
    VEHICLE_ID_FOUND: { code: "422.002", message: "Vehicle id not found" }
}

const Operacao = {
    ALTERAR: 'alterar',
    APAGAR: 'apagar',
    CONSULTAR: 'consultar',
    CRIAR: 'criar'
}

const FilterOpts = {
    BY_ID: "BY_ID",
    QUERY_PARAM: "QUERY_PARAM"
}

const SortingOpts = {
    ASC: "asc",
    DESC: "desc"
}

const extractVeiculoIdFromUrl = (request) => {
    if (!request.params.veiculoId) {
        throw ErrorCode.VEHICLE_ID_FOUND;
    }
    return parseInt(request.params.veiculoId);
}

const parseVeiculoRequestBody = (body, operacao, url) => {
    let veiculoBody = {};
    if (operacao === Operacao.ALTERAR || operacao === Operacao.APAGAR) {
        veiculoBody["ID"] = extractVeiculoIdFromUrl(url);
    }

    if (body.length) {
        const json = JSON.parse(body);
        veiculoBody["DATALANCE"] = json.dataLance;
        veiculoBody["LOTE"] = json.lote;
        veiculoBody["CODIGOCONTROLE"] = json.codigoControle;
        veiculoBody["MARCA"] = json.marca;
        veiculoBody["MODELO"] = json.modelo;
        veiculoBody["ANOFABRICACAO"] = json.anoFabricacao;
        veiculoBody["ANOMODELO"] = json.anoModelo;
        veiculoBody["VALORLANCE"] = json.valorLance;
        veiculoBody["USUARIOLANCE"] = json.usuarioLance;
    }

    return veiculoBody;
}

const handleVeiculoMsgErrors = (body) => {
    if (body.mensagem) {
        if (body.mensagem === 'nao encontrado') {
            throw ErrorCode.VEHICLE_NOT_FOUND;
        } else if (body.mensagem !== "sucesso") {
            throw ErrorCode.GENERIC_ERROR;
        }
    }
}

const parseVeiculoResponseBody = (body) => {
    let respBody = '';
    if (body) {
        // Tratando mensagem de erro retornada em status code 200 :/
        handleVeiculoMsgErrors(body);

        if (!body.mensagem) {
            // Lógica para transformar as datas vindas do GET.
            // No método POST, aparentemente o servidor está apenas retornando o que é enviado, assim já vem formatado corretamente
            const dateRegex = /([0-9]{2}\/){2}[0-9]{4} - [0-9]{2}:[0-9]{2}/
            let dataLance;
            if (body.DATALANCE) {
                if (body.DATALANCE.match(dateRegex)) {
                    dataLance = moment(body.DATALANCE, "DD/MM/YYYY - hh:mm").toISOString(true)
                } else {
                    dataLance = body.DATALANCE
                }
            }
            respBody = {
                id: body.ID,
                dataLance: dataLance,
                lote: body.LOTE,
                codigoControle: body.CODIGOCONTROLE,
                marca: body.MARCA,
                modelo: body.MODELO,
                anoFabricacao: body.ANOFABRICACAO,
                anoModelo: body.ANOMODELO,
                valorLance: body.VALORLANCE,
                usuarioLance: body.USUARIOLANCE
            }
        }
    }
    return respBody;
}

const veiculosReqPathResolver = (req) => {
    const path = "/legado/veiculo";
    logger.info(`Request path: ${req.url} - Resolved path: ${path}`)
    return path;
}

const veiculosReqBodyDecorator = (bodyContent, srcReq) => {
    const data = bodyContent.toString('utf8');
    logger.info(`Request body: ${data}`)
    let reqBody = {};
    switch (srcReq.method) {
        case 'GET':
            reqBody["OPERACAO"] = Operacao.CONSULTAR
            break;
        case 'POST':
            reqBody["OPERACAO"] = Operacao.CRIAR
            break;
        case 'PUT':
            reqBody["OPERACAO"] = Operacao.ALTERAR
            break;
        case 'DELETE':
            reqBody["OPERACAO"] = Operacao.APAGAR
            break;
        default:
            throw ErrorCode.METHOD_NOT_SUPPORTED;
    }

    reqBody["VEICULO"] = parseVeiculoRequestBody(data, reqBody["OPERACAO"], srcReq);

    logger.info(`Transformed request body: ${JSON.stringify(reqBody)}`)
    return reqBody;
}

const veiculosReqOptDecorator = (proxyReqOpts, srcReq) => {
    proxyReqOpts.method = 'POST';
    logger.info(`Resolved method: ${proxyReqOpts.method}`)
    return proxyReqOpts;
}

const veiculosResDecorator = (opts) => {
    return (proxyRes, proxyResData, userReq, userRes) => {
        const data = proxyResData.toString('utf8');
        logger.info(`Response body: ${data} - status: ${proxyRes.statusCode}`)
        let resBody = '';
        if (data.length) {
            if (proxyRes.statusCode >= 200 && proxyRes.statusCode < 400) {
                const json = JSON.parse(data);
                if (Array.isArray(json)) {
                    resBody = json.map(veiculo => parseVeiculoResponseBody(veiculo))
                } else {
                    resBody = parseVeiculoResponseBody(json)
                }
            } else {
                resBody = data;
            }

            if (opts) {
                const inicioAnoFabricacaoRegex = /^inicioAnoFabricacao$/
                const fimAnoFabricacaoRegex = /^fimAnoFabricacao$/
                const sortFieldRegex = /^sortFieldDataLance$/;
                const qParams = userReq.query;

                logger.info(`Proxy opts: ${JSON.stringify(opts)}`);
                if (opts.filter === FilterOpts.BY_ID) {
                    let veiculoId = extractVeiculoIdFromUrl(userReq);
                    logger.info(`Filtering by id: ${veiculoId}`)

                    resBody = resBody.find(veiculo => veiculo.id === veiculoId)
                    if (!resBody) {
                        throw ErrorCode.VEHICLE_NOT_FOUND;
                    }
                } else if (opts.filter === FilterOpts.QUERY_PARAM) {
                    const filterFields = Object.keys(qParams).filter(qParam => !qParam.match(sortFieldRegex));
                    if (filterFields) {
                        logger.info(`Filtering by fields: ${filterFields}`);
                        filterFields.forEach(qParam => {
                            let filter;
                            if (qParam.match(inicioAnoFabricacaoRegex) || qParam.match(fimAnoFabricacaoRegex)) {
                                const qParamFormatted = qParam.replace(/(inicio|fim)(.)(.+)/, (g1, g2, g3, g4) => g3.toLowerCase() + g4)
                                if (qParam.match(inicioAnoFabricacaoRegex)) {
                                    filter = (veiculo => veiculo[qParamFormatted] >= qParams[qParam]);
                                } else {
                                    filter = (veiculo => veiculo[qParamFormatted] <= qParams[qParam]);
                                }
                            } else {
                                filter = (veiculo => veiculo[qParam] == qParams[qParam]);
                            }
                            resBody = resBody.filter(filter);
                        });
                    }
                }

                if (opts.sorting) {
                    const sortField = Object.keys(qParams).find(qParam => qParam.match(sortFieldRegex));
                    if (sortField) {
                        logger.info(`Sorting by field: ${sortField}`);
                        const qParamFormatted = sortField.replace(/(sortField)(.)(.+)/, (g1, g2, g3, g4) => g3.toLowerCase() + g4)
                        let sorting;
                        if (qParams[sortField] == SortingOpts.ASC) {
                            sorting = (a, b) => { return moment(a[qParamFormatted]).isAfter(b[qParamFormatted]) ? 1 : -1 };
                        } else if (qParams[sortField] == SortingOpts.DESC) {
                            sorting = (a, b) => { return moment(a[qParamFormatted]).isBefore(b[qParamFormatted]) ? 1 : -1 };
                        }
                        if (sorting) {
                            resBody.sort(sorting);
                        }
                    }

                }
            }
        }
        return resBody;
    }
}

const veiculosProxy = (opts) => {
    return proxy('https://dev.apiluiza.com.br', {
        proxyReqPathResolver: veiculosReqPathResolver,
        proxyReqOptDecorator: veiculosReqOptDecorator,
        proxyReqBodyDecorator: veiculosReqBodyDecorator,
        userResDecorator: veiculosResDecorator(opts),
        proxyErrorHandler: (err, res, next) => {
            logger.info(`Error at requesting veiculos proxy`)
            if (err && err.code) {
                return res.status(err.code.split('.')[0]).send(err);
            } else {
                next(err);
            }
        }
    })
}

exports.FilterOpts = FilterOpts
exports.veiculosProxy = veiculosProxy
