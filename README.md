# REST API - Leilões Veículo Proxy
Projeto para exercitar conhecimentos de desenvolvimento utilizando design RESTful.
O objetivo do projeto é criar uma camada de abstração sobre uma API fora dos padrões REST e definir os contratos que serão utilizados em um desenvolvimento futuro.

### Requisitos
* Node
* Postman (opcional, os requests podem ser feitos utilizando qualquer ferramenta similar)

### Como executar
1. Faça o clone do repositório.
2. Na pasta raíz, baixar depedências do projeto com comando `npm install`.
3. Para rodar o servidor, execute o comando `npm run start`
4. Agora basta utilizar a collection do postman disponibilizada no diretório `postman_collection`.

### Postman Collection
A collection [VeiculosLeilao.postman_collection.json](https://github.com/Diones/veiculos-leilao/blob/main/postman_collection/VeiculosLeilao.postman_collection.json) é constituída de 5 requests:

1. Cria um veículo utilizando `POST` e retorna status `201 - Created` com id do veículo no header `veiculo-id`;
2. Altera dados do veículo utilizando `PUT` e retorna status `204 - No content`;
3. Remove um veículo `DELETE` e retorna status `204 - No content`;
4. Realiza consulta de veículos podendo ser adicionado filtros (suporta todos os campos) e ordenção pelo campo `dataLance` crescente `asc` ou descrecente `desc` e retorna os dados encontrados com status `200 - Ok`;
5. Consulta veículo por id e retorna dos dados encontrados com status `200 - Ok`.

>_Todas as chamadas contendo ID como path da URL tratam erros de ids não encontrados retornando no corpo da resposta os dados do erro bem como o código associado à ele e status `404 - Not found`_
>_Chamadas com `POST` e `PUT` com corpo faltando campos retorna erro de campo obrigatório com status `400 - Bad request`_

### Swagger
A documentação do contrato pode ser encontrada em [veiculos-leilao-openapi.yaml](https://github.com/Diones/veiculos-leilao/blob/main/openapi_doc/veiculos-leilao-openapi.yaml)
