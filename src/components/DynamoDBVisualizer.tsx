import React, { useState } from "react";
import { Evaluation } from "../types";
import { Database, FileCode, CheckCircle, Table, Brain } from "lucide-react";

interface DynamoDBVisualizerProps {
  items: Evaluation[];
}

export function DynamoDBVisualizer({ items }: DynamoDBVisualizerProps) {
  const [activeTab, setActiveTab] = useState<"items" | "schema">("items");

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden" id="dynamodb-visualizer">
      {/* Header */}
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Database className="h-5 w-5 text-indigo-600" />
          <div>
            <h3 className="font-semibold text-slate-800 text-xs md:text-sm">Tabla DynamoDB: <code>Evaluations-Production</code></h3>
            <p className="text-[10px] text-slate-500">Persistencia durable NoSQL en AWS Cloud (Simulado)</p>
          </div>
        </div>
        <div className="flex bg-slate-200/60 p-0.5 rounded-lg text-xs font-medium">
          <button
            id="tab-dynamo-items"
            onClick={() => setActiveTab("items")}
            className={`flex items-center space-x-1 px-3 py-1 rounded-md transition ${activeTab === "items" ? "bg-white text-slate-800 shadow-xs" : "text-slate-600 hover:text-slate-800"}`}
          >
            <Table className="h-3.5 w-3.5" />
            <span>Items ({items.length})</span>
          </button>
          <button
            id="tab-dynamo-schema"
            onClick={() => setActiveTab("schema")}
            className={`flex items-center space-x-1 px-3 py-1 rounded-md transition ${activeTab === "schema" ? "bg-white text-slate-800 shadow-xs" : "text-slate-600 hover:text-slate-800"}`}
          >
            <FileCode className="h-3.5 w-3.5" />
            <span>Esquema JSON</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === "items" ? (
          <div className="space-y-4">
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs text-slate-600 border-collapse">
                <thead className="bg-slate-50 text-[10px] uppercase font-semibold text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3 border-r border-slate-200">PK (evaluationId)</th>
                    <th className="py-2 px-3 border-r border-slate-200">courseId</th>
                    <th className="py-2 px-3 border-r border-slate-200">title</th>
                    <th className="py-2 px-3 border-r border-slate-200">status</th>
                    <th className="py-2 px-3">dueDate (ISO 8601)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        La tabla de DynamoDB está vacía.
                      </td>
                    </tr>
                  ) : (
                    items.map((item) => (
                      <tr key={item.evaluationId} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 border-r border-slate-200 font-semibold text-indigo-600">
                          &quot;{item.evaluationId}&quot;
                        </td>
                        <td className="py-2.5 px-3 border-r border-slate-200 text-slate-700">
                          &quot;{item.courseId}&quot;
                        </td>
                        <td className="py-2.5 px-3 border-r border-slate-200 truncate max-w-[150px] text-slate-800" title={item.title}>
                          &quot;{item.title}&quot;
                        </td>
                        <td className="py-2.5 px-3 border-r border-slate-200 text-slate-700">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            item.status === 'active' ? 'bg-emerald-50 text-emerald-700' :
                            item.status === 'completed' ? 'bg-indigo-50 text-indigo-700' :
                            'bg-red-50 text-red-700'
                          }`}>
                            &quot;{item.status}&quot;
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 truncate max-w-[160px]" title={item.dueDate}>
                          &quot;{item.dueDate}&quot;
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Live stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Table Status</div>
                  <div className="text-xs font-semibold text-slate-600">ACTIVE</div>
                </div>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex items-center space-x-2">
                <Brain className="h-4 w-4 text-purple-500 shrink-0" />
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">PK Index</div>
                  <div className="text-xs font-semibold text-slate-600">evaluationId (HASH)</div>
                </div>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex items-center space-x-2">
                <Database className="h-4 w-4 text-indigo-500 shrink-0" />
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Storage Mode</div>
                  <div className="text-xs font-semibold text-slate-600">Pay-per-request</div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-slate-500 leading-relaxed">
              DynamoDB almacena registros en formato llave-valor NoSQL, lo cual nos permite estructurar documentos JSON con flexibilidad total. Así luce la representación de un documento individual en este esquema:
            </p>
            <div className="bg-slate-950 text-purple-200 p-3.5 rounded-lg text-xs font-mono max-h-[220px] overflow-y-auto leading-relaxed">
              <pre>{`{
  "evaluationId": { "S": "eval-9a8b7c" },
  "courseId": { "S": "CS-101" },
  "title": { "S": "Introducción a Algoritmos - Examen Parcial" },
  "description": { "S": "Evaluación teórica..." },
  "dueDate": { "S": "2026-06-20T23:59:59.000Z" },
  "status": { "S": "active" },
  "createdAt": { "S": "2026-06-10T14:30:00.000Z" }
}`}</pre>
            </div>
            <div className="text-[10px] text-amber-600 bg-amber-50 border border-amber-100 p-2 rounded-md leading-relaxed mt-1">
              🚀 <strong>Tip Pro:</strong> El indexado directo de llave primary hash (<code>evaluationId</code>) asegura lecturas O(1) consistentes sobre DynamoDB en producción, minimizando RCU (Read Capacity Units).
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
