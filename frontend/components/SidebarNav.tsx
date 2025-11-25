"use client";

interface SidebarNavProps {
  active: string;
  onSelect: (tab: string) => void;
}

const tabs = [
  { id: "dashboard", label: "Dashboard" },
  { id: "workspace", label: "Agent workspace" },
];

export function SidebarNav({ active, onSelect }: SidebarNavProps) {
  return (
    <div className="w-full lg:w-52 border-r border-[#2c2c2c] bg-[#121212] p-4 space-y-2">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onSelect(tab.id)}
          className={`w-full text-left rounded px-3 py-2 text-sm ${
            active === tab.id
              ? "bg-[#1d1d1d] text-[#f1f1f1] border border-[#2c2c2c]"
              : "text-[#9f9f9f] hover:text-[#f1f1f1]"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
