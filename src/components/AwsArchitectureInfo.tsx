import React, { useState } from "react";
import { Copy, Check, Terminal, ExternalLink, Award, Play } from "lucide-react";

export function AwsArchitectureInfo() {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const lambdaCode = `/**
 * AWS Lambda - Handler para CRUD de Evaluaciones (Node.js 18.x)
 * Serves routes: GET /evaluations, GET /evaluations/{id}, POST /evaluations, PUT /evaluations/{id}, DELETE /evaluations/{id}
 */
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { 
  DynamoDBDocumentClient, 
  ScanCommand, 
  GetCommand, 
  PutCommand, 
  UpdateCommand, 
  DeleteCommand 
} = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" });
const ddbDocClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.EVALUATIONS_TABLE || "Evaluations-Production";

exports.handler = async (event) => {
  console.log("Event received:", JSON.stringify(event));
  const { httpMethod, resource, pathParameters, body } = event;
  let response;
  
  try {
    switch (resource) {
      // GET /evaluations (List with courseId and status filtering)
      case "/evaluations":
        if (httpMethod === "GET") {
          const { courseId, status } = event.queryStringParameters || {};
          let scanParams = { TableName: TABLE_NAME };
          
          if (courseId || status) {
            let filterExpressions = [];
            let expressionAttributeValues = {};
            
            if (courseId) {
              filterExpressions.push("courseId = :courseId");
              expressionAttributeValues[":courseId"] = courseId.toUpperCase();
            }
            if (status) {
              filterExpressions.push("#statusAttr = :statusValue");
              expressionAttributeValues[":statusValue"] = status;
              scanParams.ExpressionAttributeNames = { "#statusAttr": "status" };
            }
            
            scanParams.FilterExpression = filterExpressions.join(" AND ");
            scanParams.ExpressionAttributeValues = expressionAttributeValues;
          }
          
          const scanOutput = await ddbDocClient.send(new ScanCommand(scanParams));
          return responseBuilder(200, scanOutput.Items);
        }
        break;
        
      // GET, PUT, DELETE /evaluations/{id}
      case "/evaluations/{id}":
        const { id } = pathParameters || {};
        if (!id) return responseBuilder(400, { error: "evaluationId parameter is missing." });
        
        // GET /evaluations/{id}
        if (httpMethod === "GET") {
          const getOutput = await ddbDocClient.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: { evaluationId: id }
          }));
          if (!getOutput.Item) return responseBuilder(404, { error: "Evaluation not found." });
          return responseBuilder(200, getOutput.Item);
        }
        
        // PUT /evaluations/{id}
        if (httpMethod === "PUT") {
          const payload = JSON.parse(body);
          const updateParams = {
            TableName: TABLE_NAME,
            Key: { evaluationId: id },
            UpdateExpression: "set courseId = :c, title = :t, description = :d, dueDate = :du, #statusAttr = :s",
            ExpressionAttributeValues: {
              ":c": payload.courseId.toUpperCase(),
              ":t": payload.title,
              ":d": payload.description,
              ":du": payload.dueDate,
              ":s": payload.status
            },
            ExpressionAttributeNames: {
              "#statusAttr": "status"
            },
            ReturnValues: "ALL_NEW"
          };
          const updateOutput = await ddbDocClient.send(new UpdateCommand(updateParams));
          return responseBuilder(200, updateOutput.Attributes);
        }
        
        // DELETE /evaluations/{id}
        if (httpMethod === "DELETE") {
          await ddbDocClient.send(new DeleteCommand({
            TableName: TABLE_NAME,
            Key: { evaluationId: id }
          }));
          return responseBuilder(200, { success: true, message: "Deleted successfully." });
        }
        break;
        
      // POST /evaluations (Create)
      case "/evaluations":
        if (httpMethod === "POST") {
          const payload = JSON.parse(body);
          const evaluationId = "eval-" + Math.random().toString(36).substring(2, 8);
          const item = {
            evaluationId,
            courseId: payload.courseId.toUpperCase(),
            title: payload.title,
            description: payload.description,
            dueDate: payload.dueDate,
            status: payload.status || "active",
            createdAt: new Date().toISOString()
          };
          
          await ddbDocClient.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: item
          }));
          return responseBuilder(201, item);
        }
        break;
        
      default:
        return responseBuilder(400, { error: "Unsupported API route." });
    }
  } catch (error) {
    console.error("Database error occurred:", error);
    return responseBuilder(500, { error: error.message });
  }
};

function responseBuilder(status, data) {
  return {
    statusCode: status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Credentials": true
    },
    body: JSON.stringify(data)
  };
}`;

  const serverlessYaml = `service: avacom-evaluations-service

provider:
  name: aws
  runtime: nodejs18.x
  region: us-east-1
  environment:
    EVALUATIONS_TABLE: { "Ref": "EvaluationsTable" }
  iamRoleStatements:
    - Effect: Allow
      Action:
        - dynamodb:Scan
        - dynamodb:GetItem
        - dynamodb:PutItem
        - dynamodb:UpdateItem
        - dynamodb:DeleteItem
      Resource: !GetAtt EvaluationsTable.Arn

functions:
  api:
    handler: handler.handler
    events:
      - http:
          path: evaluations
          method: get
          cors: true
      - http:
          path: evaluations
          method: post
          cors: true
      - http:
          path: evaluations/{id}
          method: get
          cors: true
      - http:
          path: evaluations/{id}
          method: put
          cors: true
      - http:
          path: evaluations/{id}
          method: delete
          cors: true

resources:
  Resources:
    EvaluationsTable:
      Type: AWS::DynamoDB::Table
      Properties:
        TableName: Evaluations-Production
        AttributeDefinitions:
          - AttributeName: evaluationId
            AttributeType: S
        KeySchema:
          - AttributeName: evaluationId
            KeyType: HASH
        BillingMode: PAY_PER_REQUEST`;

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden" id="aws-architecture-section">
      <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-4 text-white flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Award className="h-5 w-5" />
          <h3 className="font-semibold text-sm md:text-base">Documentación AWS Serverless (AVACOM Demo Q&A)</h3>
        </div>
        <span className="text-xs bg-white/20 px-2.5 py-1 rounded-full font-medium backdrop-blur-xs">
          Production-Ready Lambda + DynamoDB
        </span>
      </div>

      <div className="p-5 space-y-6">
        <div>
          <h4 className="text-sm font-semibold text-slate-800 flex items-center space-x-1.5 mb-2">
            <span className="flex h-5 w-5 items-center justify-between rounded-full bg-orange-100 text-orange-600 text-xs font-bold pl-[6px]">1</span>
            <span>Estrategia de Arquitectura</span>
          </h4>
          <p className="text-xs text-slate-600 leading-relaxed pl-6">
            Para la implementación real en AWS sin costos de mantención (AWS Free Tier), se utiliza una arquitectura enteramente Serverless. 
            <strong> API Gateway (HTTP API)</strong> enruta las peticiones de forma asíncrona hacia una función única <strong>AWS Lambda (Monolith / Micro-service standard pattern)</strong> optimizada con el SDK v3 de Node.js, interactuando con una tabla **DynamoDB** bajo modo de aprovisionamiento por demanda (Pay-per-request, $0 USD de costo para bajo tráfico).
          </p>
        </div>

        {/* Tab 1: Lambda Code */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2 pl-6">
              <Terminal className="h-4 w-4 text-slate-500" />
              <span className="text-xs font-medium text-slate-700">AWS Lambda Code (<code>handler.js</code>)</span>
            </div>
            <button
              id="copy-lambda-btn"
              onClick={() => copyToClipboard(lambdaCode, 1)}
              className="flex items-center space-x-1 text-xs text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-md transition"
            >
              {copiedIndex === 1 ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-emerald-600 font-medium">Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copiar Código</span>
                </>
              )}
            </button>
          </div>
          <div className="relative bg-slate-950 rounded-lg p-3 overflow-x-auto max-h-[300px] text-[11px] font-mono leading-relaxed text-slate-300">
            <pre>{lambdaCode}</pre>
          </div>
        </div>

        {/* Tab 2: Serverless Framework */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2 pl-6">
              <Terminal className="h-4 w-4 text-slate-500" />
              <span className="text-xs font-medium text-slate-700">YML de Infraestructura (<code>serverless.yml</code>)</span>
            </div>
            <button
              id="copy-yml-btn"
              onClick={() => copyToClipboard(serverlessYaml, 2)}
              className="flex items-center space-x-1 text-xs text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-md transition"
            >
              {copiedIndex === 2 ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-emerald-600 font-medium">Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copiar YAML</span>
                </>
              )}
            </button>
          </div>
          <div className="relative bg-slate-950 rounded-lg p-3 overflow-x-auto max-h-[200px] text-[11px] font-mono leading-relaxed text-slate-300 font-mono">
            <pre>{serverlessYaml}</pre>
          </div>
        </div>

        {/* Live Presentation Tip */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3.5 flex items-start space-x-3">
          <span className="text-amber-500 mt-0.5 text-lg">💡</span>
          <div className="text-xs text-amber-900 space-y-1">
            <p className="font-semibold">Información clave para tu Sesión en Vivo (Q&A):</p>
            <p className="leading-relaxed">
              Durante la entrevista, serás evaluado en correctitud funcional y arquitectura serverless. Puedes copiar el fragmento de arriba para demostrar capacidad de despliegue real en AWS. El frontend de esta applet ya simula transacciones DynamoDB de lectura y escritura en tiempo real.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
