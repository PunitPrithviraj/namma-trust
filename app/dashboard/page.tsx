import { Suspense } from "react";
import { connection } from "next/server"; 
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import NotificationBar from "./NotificationBar";
import AdminShareCenter from "./AdminShareCenter";
import LockExpectedAmount from "./LockExpectedAmount";

function adminRound(amount: number) {
  const integerPart = Math.floor(amount);
  const decimalPart = amount - integerPart;
  if (decimalPart > 0 && decimalPart <= 0.9199) return integerPart;
  if (decimalPart > 0.9199) return integerPart + 1;
  return integerPart;
}

async function DashboardContent() {
  await connection();
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if ((session.user as any).role === "investor") redirect("/investor-portal");

  const now = new Date();
  
  // CYCLE LOGIC: 10th to 9th
  const startOfCycle = new Date(now.getFullYear(), now.getMonth(), 10, 0, 0, 0);
  const endOfCycle = new Date(now.getFullYear(), now.getMonth() + 1, 9, 23, 59, 59);
  if (now.getDate() < 10) {
    startOfCycle.setMonth(startOfCycle.getMonth() - 1);
    endOfCycle.setMonth(endOfCycle.getMonth() - 1);
  }

  let cycleMonth = now.getMonth();
  let cycleYear = now.getFullYear();
  if (now.getDate() < 10) {
    cycleMonth -= 1;
    if (cycleMonth < 0) { cycleMonth = 11; cycleYear -= 1; }
  }

  const [investors, loans, expectedSchedules, lockedTarget] = await Promise.all([
    prisma.investor.findMany({ 
      include: { 
        investments: true, 
        withdrawals: true, 
        profitDistributions: true 
      } 
    }),
    prisma.loan.findMany({ 
      where: { status: "active" },
      include: { schedule: { orderBy: { monthNo: "asc" } } }
    }),
    prisma.loanSchedule.findMany({
      where: {
        status: "pending",
        dueDate: { gte: startOfCycle, lte: endOfCycle },
        loan: { status: "active" }
      },
      include: { loan: { include: { investor: true } } },
    }),
    prisma.expectedCycleTarget.findUnique({
      where: { month_year: { month: cycleMonth, year: cycleYear } }
    })
  ]);

  // 👈 FETCH THIS MONTH'S PROFIT DISTRIBUTIONS
  const thisMonthCycle = await prisma.monthlyCycle.findFirst({
    where: {
      cycleStart: { gte: startOfCycle, lte: endOfCycle }
    },
    include: {
      distributions: {
        include: { investor: true }
      }
    },
    orderBy: { cycleStart: "desc" }
  });

  const totalTeamRegularInvestment = investors.reduce((sum, inv) => sum + inv.investments.reduce((s, i) => s + i.amount, 0), 0);
  const totalTeamProfit = investors.reduce((sum, inv) => sum + inv.profitDistributions.reduce((s, p) => s + p.shareAmount, 0), 0);
  const totalWithdrawn = investors.reduce((sum, inv) => sum + inv.withdrawals.reduce((s, w) => s + w.amount, 0), 0);
  const totalInvestment = totalTeamRegularInvestment + totalTeamProfit;

  let activeLoanPrincipal = 0;
  loans.forEach((loan) => {
    const pendingSchedules = loan.schedule.filter(s => s.status === "pending");
    if (pendingSchedules.length > 0) activeLoanPrincipal += pendingSchedules[0].openingPrincipal;
  });

  const unspentAmount = adminRound(totalInvestment - totalWithdrawn - activeLoanPrincipal);

  let currentExpectedEMI = 0;
  expectedSchedules.forEach(sch => { currentExpectedEMI += (sch.termAmount + sch.interestAmount); });

  const activeInvestorsCount = investors.filter(i => i.status === "active").length;
  const currentExpectedInv = activeInvestorsCount * 1000;

  const displayEMI = lockedTarget ? lockedTarget.emiTarget : currentExpectedEMI;
  const displayInv = lockedTarget ? lockedTarget.invTarget : currentExpectedInv;
  const displayExtra = lockedTarget ? lockedTarget.extraTarget : 0;
  const displayTotal = lockedTarget ? lockedTarget.totalTarget : (displayEMI + displayInv + displayExtra);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Welcome, {session.user?.name || "Admin"}</h1>
          <p className="text-gray-500 mt-1 text-sm md:text-base">Namma Trust Financial Overview</p>
        </div>
        
        <div className="flex items-center gap-4">
          <AdminShareCenter 
            expectedEMI={displayEMI} 
            monthly1000={displayInv} 
            extraExpected={displayExtra} 
            grandTotal={displayTotal} 
          />
          <NotificationBar />
          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs md:text-sm font-medium">
            {(session.user as any).role?.toUpperCase()}
          </span>
        </div>
      </div>

      {/* DASHBOARD CARDS... (Keep your existing cards here) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
        <Link href="/dashboard/total-investment" className="block bg-white p-5 rounded-lg shadow-sm border-t-4 border-green-500 hover:scale-[1.02] transition-transform cursor-pointer">
          <p className="text-sm font-medium text-gray-500">Total Investment</p>
          <p className="text-2xl md:text-3xl font-bold text-gray-800 mt-2">₹{totalInvestment.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <p className="text-xs text-gray-400 mt-2">Includes Accrued Profit</p>
        </Link>

        <div className="bg-white p-5 rounded-lg shadow-sm border-t-4 border-blue-500">
          <p className="text-sm font-medium text-gray-500">Total Team Regular Inv.</p>
          <p className="text-2xl md:text-3xl font-bold text-blue-600 mt-2">₹{totalTeamRegularInvestment.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <p className="text-xs text-gray-400 mt-2">Actual Deposits Only</p>
        </div>

        <div className="bg-white p-5 rounded-lg shadow-sm border-t-4 border-purple-500">
          <p className="text-sm font-medium text-gray-500">Total Team Profit</p>
          <p className="text-2xl md:text-3xl font-bold text-purple-600 mt-2">₹{totalTeamProfit.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <p className="text-xs text-gray-400 mt-2">Credited Profit</p>
        </div>

        <div className="bg-white p-5 rounded-lg shadow-sm border-t-4 border-orange-500">
          <p className="text-sm font-medium text-gray-500 flex items-center gap-1">Unspent Cash</p>
          <p className="text-2xl md:text-3xl font-bold text-orange-600 mt-2">₹{unspentAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <p className="text-xs text-gray-400 mt-2">Available Funds</p>
        </div>

        <div className="bg-white p-5 rounded-lg shadow-sm border-t-4 border-indigo-500">
          <p className="text-sm font-medium text-gray-500">Loan Disbursed (Active)</p>
          <p className="text-2xl md:text-3xl font-bold text-indigo-600 mt-2">₹{activeLoanPrincipal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <p className="text-xs text-gray-400 mt-2">Outstanding Principal</p>
        </div>

        {/* LOCKED EXPECTED TARGET CARD */}
        <div className="bg-teal-50 p-5 rounded-lg shadow-sm border border-teal-200 sm:col-span-2 relative">
          <div className="flex justify-between items-center">
            <p className="text-sm font-bold text-teal-800">Expected Collection (10th to 9th)</p>
            <span className={`text-xs px-2 py-1 rounded font-bold ${lockedTarget ? "bg-teal-600 text-white" : "bg-orange-100 text-orange-700"}`}>
              {lockedTarget ? "LOCKED TARGET" : "LIVE ESTIMATE"}
            </span>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-teal-700 mt-2">₹{displayTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          
          <div className="flex flex-col gap-1 mt-3 text-xs text-teal-700 bg-white/70 p-3 rounded mb-12">
            <div className="flex justify-between"><span>EMI Collections:</span> <span className="font-bold">₹{displayEMI.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
            <div className="flex justify-between"><span>Monthly ₹1k Inv:</span> <span className="font-bold">₹{displayInv.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
            <div className="flex justify-between"><span>Extra Expected:</span> <span className="font-bold">₹{displayExtra.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
          </div>

          <LockExpectedAmount 
            isLocked={!!lockedTarget}
            currentEMI={currentExpectedEMI}
            currentInv={currentExpectedInv}
            initialExtra={displayExtra}
          />
        </div>
      </div>

      {/* 👈 NEW: THIS MONTH'S DISTRIBUTION FOR ALL INVESTORS */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-5 border-b bg-gray-50 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-800">This Month's Profit Distribution</h2>
          <Link href="/profits" className="text-sm text-blue-600 hover:underline font-medium">Manage Cycles</Link>
        </div>
        
        {thisMonthCycle ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-600 font-medium border-b">
                <tr>
                  <th className="px-6 py-4">Investor Name</th>
                  <th className="px-6 py-4 text-right">Balance Used</th>
                  <th className="px-6 py-4 text-right">Profit Credited</th>
                  <th className="px-6 py-4 text-center">Date Paid</th>
                </tr>
              </thead>
              <tbody>
                {thisMonthCycle.distributions.map((dist) => (
                  <tr key={dist.id} className="border-t hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-800">
                      <Link href={`/investors/${dist.investorId}`} className="hover:text-blue-600">
                        {dist.investor.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-right text-gray-500">
                      ₹{dist.balanceUsed.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-green-600">
                      +₹{dist.shareAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-center text-gray-500">
                      {dist.paidDate ? new Date(dist.paidDate).toLocaleDateString("en-IN") : "N/A"}
                    </td>
                  </tr>
                ))}
                {thisMonthCycle.distributions.length === 0 && (
                  <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">No distributions made for this cycle yet.</td></tr>
                )}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-black">
                  <td colSpan={2} className="px-6 py-4 text-right font-bold">Total Distributed:</td>
                  <td className="px-6 py-4 text-right font-bold text-green-700 text-lg">
                    ₹{thisMonthCycle.distributions.reduce((sum, d) => sum + d.shareAmount, 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500">
            No profit cycle active for this month (10th to 9th).
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading dashboard...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
