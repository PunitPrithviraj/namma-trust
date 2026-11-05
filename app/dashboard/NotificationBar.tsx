"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Bell, TrendingUp, Wallet, Banknote } from "lucide-react";

export default function NotificationBar() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/admin/notifications")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setNotifications(data);
      });
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Count only pending loans for the red badge
  const pendingLoans = notifications.filter((n) => n.type === "loan_request").length;

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 bg-white rounded-full border border-gray-200 hover:bg-gray-50 transition-colors shadow-sm"
      >
        <Bell className="w-5 h-5 text-gray-600" />
        {pendingLoans > 0 && (
          <span className="absolute top-0 right-0 transform translate-x-1/3 -translate-y-1/3 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
            {pendingLoans}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
          <div className="p-3 border-b bg-gray-50 flex justify-between items-center">
            <h3 className="font-bold text-gray-800 text-sm">All Notifications</h3>
            <span className="text-xs text-blue-600 font-medium cursor-pointer hover:underline">Clear</span>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-gray-500 text-sm">
                No notifications yet.
              </div>
            ) : (
              notifications.map((notif) => (
                <Link 
                  key={notif.id} 
                  href={notif.link}
                  onClick={() => setIsOpen(false)}
                  className="block p-4 border-b hover:bg-blue-50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-full mt-1 ${
                      notif.type === "loan_request" ? "bg-orange-100 text-orange-600" : 
                      notif.type === "profit" ? "bg-purple-100 text-purple-600" : 
                      "bg-green-100 text-green-600"
                    }`}>
                      {notif.type === "loan_request" && <Banknote className="w-4 h-4" />}
                      {notif.type === "profit" && <TrendingUp className="w-4 h-4" />}
                      {notif.type === "investment" && <Wallet className="w-4 h-4" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-1">
                        <p className="text-sm font-bold text-gray-800">
                          {notif.title}
                        </p>
                        <span className="text-[10px] text-gray-400">
                          {new Date(notif.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">{notif.message}</p>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
