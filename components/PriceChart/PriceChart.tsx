"use client";

import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";

const data = [
  { date: "2024-01-01", price: 400 },
  { date: "2024-02-01", price: 420 },
  { date: "2024-03-01", price: 380 },
  { date: "2024-04-01", price: 450 },
  { date: "2024-05-01", price: 440 },
  { date: "2024-06-01", price: 470 },
];

const PriceChart = () => {
  return (
    <div style={{ width: "100%", height: 300, background: "rgba(0,0,0,0.2)", padding: "20px", borderRadius: "12px" }}>
      <h3 style={{ marginBottom: "20px", fontSize: "0.9rem", color: "#888", textTransform: "uppercase" }}>
        Historial de Precios ($)
      </h3>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ffd700" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#ffd700" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
          <XAxis 
            dataKey="date" 
            stroke="#444" 
            fontSize={12} 
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            stroke="#444" 
            fontSize={12} 
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `$${value}`}
          />
          <Tooltip 
            contentStyle={{ background: "#111", border: "1px solid #333", color: "#fff" }}
            itemStyle={{ color: "#ffd700" }}
          />
          <Area 
            type="monotone" 
            dataKey="price" 
            stroke="#ffd700" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorPrice)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PriceChart;
