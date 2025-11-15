"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// Mock data generators - replace with real data later
const generateCallVolumeData = () => {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    days.push({
      name: date.toLocaleDateString("en-US", { weekday: "short" }),
      calls: Math.floor(Math.random() * 50) + 20,
    });
  }
  return days;
};

const generateCallDurationData = () => {
  return [
    { name: "0-30s", value: 45 },
    { name: "30s-2m", value: 120 },
    { name: "2-5m", value: 85 },
    { name: "5m+", value: 30 },
  ];
};

const generateCallOutcomesData = () => {
  return [
    { name: "Bookings", value: 65, color: "#10b981" },
    { name: "Info Requests", value: 45, color: "#3b82f6" },
    { name: "Missed", value: 20, color: "#ef4444" },
    { name: "Transferred", value: 15, color: "#f59e0b" },
  ];
};

const generateSentimentData = () => {
  return [
    { name: "Positive", value: 70, color: "#10b981" },
    { name: "Neutral", value: 25, color: "#6b7280" },
    { name: "Negative", value: 5, color: "#ef4444" },
  ];
};

const generatePeakHoursData = () => {
  const hours = [];
  for (let i = 8; i <= 20; i++) {
    hours.push({
      hour: `${i}:00`,
      calls: Math.floor(Math.random() * 30) + 5,
    });
  }
  return hours;
};

const generateBookingActivityData = () => {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    days.push({
      name: date.toLocaleDateString("en-US", { weekday: "short" }),
      bookings: Math.floor(Math.random() * 15) + 5,
      revenue: Math.floor(Math.random() * 2000) + 500,
    });
  }
  return days;
};

const generateCallReasonsData = () => {
  return [
    { reason: "Appointment Booking", calls: 85 },
    { reason: "General Inquiry", calls: 62 },
    { reason: "Support", calls: 45 },
    { reason: "Pricing", calls: 38 },
    { reason: "Other", calls: 22 },
  ];
};

// Chart Components
export function CallVolumeChart() {
  const data = generateCallVolumeData();
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="name" stroke="#6b7280" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
        <YAxis stroke="#6b7280" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{
            backgroundColor: "white",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            fontSize: "12px",
          }}
        />
        <Area
          type="monotone"
          dataKey="calls"
          stroke="#3b82f6"
          strokeWidth={2}
          fill="url(#colorCalls)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function CallDurationChart() {
  const data = generateCallDurationData();
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="name" stroke="#6b7280" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
        <YAxis stroke="#6b7280" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{
            backgroundColor: "white",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            fontSize: "12px",
          }}
        />
        <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]} activeBar={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CallOutcomesChart() {
  const data = generateCallOutcomesData();
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: "white",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            fontSize: "12px",
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function SentimentChart() {
  const data = generateSentimentData();
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: "white",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            fontSize: "12px",
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function PeakHoursChart() {
  const data = generatePeakHoursData();
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="hour" stroke="#6b7280" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={60} tickLine={false} axisLine={false} />
        <YAxis stroke="#6b7280" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{
            backgroundColor: "white",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            fontSize: "12px",
          }}
        />
        <Bar dataKey="calls" fill="#8b5cf6" radius={[8, 8, 0, 0]} activeBar={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function BookingActivityChart() {
  const data = generateBookingActivityData();
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="name" stroke="#6b7280" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
        <YAxis yAxisId="left" stroke="#6b7280" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
        <YAxis yAxisId="right" orientation="right" stroke="#10b981" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{
            backgroundColor: "white",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            fontSize: "12px",
          }}
        />
        <Legend />
        <Line yAxisId="left" type="monotone" dataKey="bookings" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
        <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function CallResponseMetricsChart() {
  const data = [
    { metric: "Response Time", value: 1.2, target: 2.0 },
    { metric: "Resolution Rate", value: 85, target: 90 },
    { metric: "Availability", value: 98, target: 95 },
  ];
  
  return (
    <div className="space-y-4 h-full flex flex-col justify-center">
      {data.map((item, index) => (
        <div key={index} className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-gray-600">{item.metric}</span>
            <span className="font-medium text-gray-900">
              {item.metric === "Response Time" ? `${item.value}s` : `${item.value}%`}
            </span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all"
              style={{ width: `${(item.value / item.target) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function TopCallReasonsChart() {
  const data = generateCallReasonsData();
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 10, left: 80, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis type="number" stroke="#6b7280" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
        <YAxis dataKey="reason" type="category" stroke="#6b7280" tick={{ fontSize: 11 }} width={70} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{
            backgroundColor: "white",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            fontSize: "12px",
          }}
        />
        <Bar dataKey="calls" fill="#f59e0b" radius={[0, 8, 8, 0]} activeBar={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function MonthlySummaryChart() {
  const metrics = [
    { label: "Total Calls", value: "1,245", change: "+12%" },
    { label: "Bookings", value: "342", change: "+8%" },
    { label: "Avg Sentiment", value: "4.2/5", change: "+0.3" },
    { label: "Revenue", value: "$12.4k", change: "+15%" },
  ];
  
  return (
    <div className="grid grid-cols-2 gap-4 h-full">
      {metrics.map((metric, index) => (
        <div key={index} className="bg-gray-50 rounded-lg p-4">
          <p className="text-xs text-gray-500 mb-1">{metric.label}</p>
          <p className="text-xl font-semibold text-gray-900">{metric.value}</p>
          <p className="text-xs text-green-600 mt-1">{metric.change}</p>
        </div>
      ))}
    </div>
  );
}

export function CallQualityScoreChart() {
  const score = 87;
  const circumference = 2 * Math.PI * 60;
  const offset = circumference - (score / 100) * circumference;
  
  return (
    <div className="flex items-center justify-center h-full">
      <div className="relative">
        <svg className="transform -rotate-90" width="140" height="140">
          <circle
            cx="70"
            cy="70"
            r="60"
            stroke="#e5e7eb"
            strokeWidth="12"
            fill="none"
          />
          <circle
            cx="70"
            cy="70"
            r="60"
            stroke="#10b981"
            strokeWidth="12"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-gray-900">{score}</span>
          <span className="text-xs text-gray-500">Quality Score</span>
        </div>
      </div>
    </div>
  );
}

const generateCostData = () => {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const credits = Math.floor(Math.random() * 800) + 200;
    const llmCost = Math.random() * 0.01 + 0.001;
    days.push({
      name: date.toLocaleDateString("en-US", { weekday: "short" }),
      credits: credits,
      llmCost: llmCost,
      totalCost: credits + (llmCost * 1000), // Convert LLM cost to credits equivalent
    });
  }
  return days;
};

export function CostChart() {
  const data = generateCostData();
  
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorCredits" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorLLM" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
        <XAxis 
          dataKey="name" 
          stroke="#6b7280"
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis 
          yAxisId="left"
          stroke="#3b82f6"
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `${(value / 1000).toFixed(1)}K`}
        />
        <YAxis 
          yAxisId="right"
          orientation="right"
          stroke="#10b981"
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `$${value.toFixed(3)}`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "white",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            padding: "8px 12px",
            fontSize: "12px",
          }}
          formatter={(value: number, name: string) => {
            if (name === "credits") {
              return [`${value.toLocaleString()} credits`, "Credits"];
            }
            if (name === "llmCost") {
              return [`$${value.toFixed(4)}`, "LLM Cost"];
            }
            return [value, name];
          }}
        />
        <Legend 
          wrapperStyle={{ paddingTop: "20px", fontSize: "12px" }}
          iconType="circle"
        />
        <Area
          yAxisId="left"
          type="monotone"
          dataKey="credits"
          stroke="#3b82f6"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#colorCredits)"
          name="Credits"
        />
        <Area
          yAxisId="right"
          type="monotone"
          dataKey="llmCost"
          stroke="#10b981"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#colorLLM)"
          name="LLM Cost"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

const generateLLMCostData = () => {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const llmCost = Math.random() * 0.01 + 0.001;
    days.push({
      name: date.toLocaleDateString("en-US", { weekday: "short" }),
      llmCost: llmCost,
    });
  }
  return days;
};

export function LLMCostChart() {
  const data = generateLLMCostData();
  
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorLLMOnly" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
        <XAxis 
          dataKey="name" 
          stroke="#6b7280"
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis 
          stroke="#10b981"
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `$${value.toFixed(4)}`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "white",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            padding: "8px 12px",
            fontSize: "12px",
          }}
          formatter={(value: number) => [`$${value.toFixed(4)}`, "LLM Cost"]}
        />
        <Area
          type="monotone"
          dataKey="llmCost"
          stroke="#10b981"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#colorLLMOnly)"
          name="LLM Cost"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

