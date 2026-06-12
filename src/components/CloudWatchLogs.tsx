import React, { useEffect, useState, useRef } from "react";
import { CloudWatchLog } from "../types";
import { Terminal, RefreshCw, Trash2, ShieldAlert, Cpu, Sparkles } from "lucide-react";

interface CloudWatchLogsProps {
  logs: CloudWatchLog[];
  onClear: () => void;
  onRefresh: () => void;
  isLoading: boolean;
}

export function CloudWatchLogs({ logs, onClear, onRefresh, isLoading }: CloudWatchLogsProps) {
  const terminalEndRef = useRef<HTMLDivElement>(null);
  
  // Auto scroll terminal to the bottom whenever logs change
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  // Compute live Lambda metrics
  const totalRequests = logs.filter(l => l.message.includes("Method=")).length;
  const errors = logs.filter(l => l.level === "error").length;
  const errorRate = totalRequests > 0 ? Math.round((errors / totalRequests) * 100) : 0;
  const avgDuration = (() => {
    const executed = logs.filter(l => typeof l.executionTimeMs === "number" && l.executionTimeMs > 0);
    if (executed.length === 0) return 0;
    const sum = executed.reduce((acc, current) => acc + (current.executionTimeMs || 0), 0);
    return Math.round(sum / executed.length);
  })();

  return (
    <div className="bg-slate-900 text-slate-100 rounded-xl shadow-md border border-slate-800 overflow-hidden" id="cloudwatch-panel">
      {/* Header */}
      <div className="bg-slate-950 px-4 py-3 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <Terminal className="h-5 w-5 text-purple-400" />
          <span className="font-mono text-xs font-semibold text-purple-200">
            AWS CloudWatch Logs Consolidation (Simulated)
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            id="refresh-cloudwatch-btn"
            onClick={onRefresh}
            className="p-1 px-2.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition text-[11px] font-mono flex items-center space-x-1"
            disabled={isLoading}
            title="Sincronizar Logs"
          >
            <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
            <span>Sync</span>
          </button>
          <button
            id="clear-cloudwatch-btn"
            onClick={onClear}
            className="p-1 px-2.5 rounded-md hover:bg-red-950/40 text-slate-400 hover:text-red-300 transition text-[11px] font-mono flex items-center space-x-1"
            title="Limpiar Logs"
          >
            <Trash2 className="h-3 w-3" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Live Serverless Metrics Bar */}
      <div className="bg-slate-950/50 px-4 py-2.5 border-b border-slate-800 grid grid-cols-4 gap-2 text-center text-[10px] text-slate-400 font-mono">
        <div className="border-r border-slate-800/55">
          <div className="text-[11px] text-slate-500">MÉTRICA AMBIENTE</div>
          <div className="text-xs font-semibold text-emerald-400">AWS Lambdas</div>
        </div>
        <div className="border-r border-slate-800/55">
          <div className="text-[11px] text-slate-500">PETICIONES (TURN)</div>
          <div className="text-xs font-semibold text-purple-300">{totalRequests}</div>
        </div>
        <div className="border-r border-slate-800/55">
          <div className="text-[11px] text-slate-500">DURACIÓN PROMEDIO</div>
          <div className="text-xs font-semibold text-indigo-300">{avgDuration || 11}ms</div>
        </div>
        <div>
          <div className="text-[11px] text-slate-500">TASA ERROR</div>
          <span className={`text-xs font-semibold ${errorRate > 0 ? 'text-red-400' : 'text-slate-300'}`}>
            {errorRate}%
          </span>
        </div>
      </div>

      {/* Terminal logs view */}
      <div className="p-4 bg-slate-950/80 font-mono text-[11px] overflow-y-auto max-h-[350px] space-y-2 select-text selection:bg-purple-800 scrollbar-thin scrollbar-thumb-slate-800">
        {logs.length === 0 ? (
          <div className="text-center py-6 text-slate-600">
            &lt; Terminal vacía. Realiza acciones arriba para gatillar ejecuciones serverless &gt;
          </div>
        ) : (
          logs.map((log, index) => {
            const time = log.timestamp.split("T")[1]?.substring(0, 8) || log.timestamp;
            const isError = log.level === "error";
            const isWarn = log.level === "warn";
            
            let colorClass = "text-slate-300";
            if (isError) colorClass = "text-red-400 font-bold bg-red-950/20 px-1 py-0.5 rounded";
            else if (isWarn) colorClass = "text-yellow-400 font-medium";
            else if (log.message.includes("DynamoDB")) colorClass = "text-sky-300";
            else if (log.message.includes("Status=201") || log.message.includes("Created")) colorClass = "text-emerald-400";
            
            return (
              <div key={index} className="border-b border-slate-900 pb-1.5 leading-relaxed flex flex-col md:flex-row md:items-start md:space-x-3">
                <span className="text-slate-500 select-none shrink-0" style={{ width: "65px" }}>[{time}]</span>
                <span className="shrink-0" style={{ width: "55px" }}>
                  <code className={`px-1 py-0.2 rounded text-[10px] font-bold ${
                    isError ? "bg-red-900/30 text-red-300" :
                    isWarn ? "bg-yellow-900/30 text-yellow-300" : "bg-slate-800 text-slate-400"
                  }`}>
                    {log.level.toUpperCase()}
                  </code>
                </span>
                <div className="flex-1 space-y-0.5">
                  <span className={colorClass}>{log.message}</span>
                  {log.requestId && (
                    <div className="text-[10px] text-slate-600 flex items-center space-x-2">
                      <span>RequestId: <span className="text-slate-500">{log.requestId}</span></span>
                      {log.executionTimeMs && (
                        <span>• billing duration: <span className="text-indigo-400">{log.executionTimeMs} ms</span></span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={terminalEndRef} />
      </div>

      {/* Footer Instructions */}
      <div className="bg-slate-900/80 px-4 py-2 border-t border-slate-800/80 text-[10px] text-slate-500 font-mono flex items-center justify-between">
        <span>Region: <span className="text-slate-400">us-east-1</span></span>
        <span>Log Group: <span className="text-slate-400">/aws/lambda/avacom-evaluations-prod</span></span>
      </div>
    </div>
  );
}
