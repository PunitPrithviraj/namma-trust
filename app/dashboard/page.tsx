import { Suspense } from "react";
import { connection } from "next/server"; 
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import AdminShareCenter from "./AdminShareCenter";
import NotificationBar from "./NotificationBar";
import ExtraExpectedForm from "./ExtraExpectedForm";

// 👈 ADMIN ROUNDING
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
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const [investors, loans, currentCycles, expectedSchedules, extraIncomeRecord] = await Promise.all([
    prisma.investor.findMany({ 
      include: { investments: true, withdrawals: true, profitDistributions: true } 
    }),
    prisma.loan.findMany({ 
      where: { status: "active" },
      include: { schedule: { orderBy: { monthNo: "asc" } } }
    }),
    prisma.profitDistribution.findMany({
      where: { cycle: { cycleStart: { gte: startOfMonth } } },
      include: { investor: true, cycle: true },
      orderBy: { cycle: { cycleStart: "desc" } },
    }),
    prisma.loanSchedule.findMany({
      where: {
        status: "pending",
        dueDate: { gte: startOfMonth, lte: endOfMonth },
        loan: { status: "active" }
      },
      include: { loan: { include: { investor: true } } },
    }),
    prisma.expectedIncome.findUnique({
      where: { month_year: { month: currentMonth, year: currentYear } }
    })
  ]);

  const totalTeamRegularInvestment = investors.reduce((sum, inv) => 
    sum + inv.investments.reduce((s, i) => s + i.amount, 0), 0
  );

  const totalTeamProfit = investors.reduce((sum, inv) => 
    sum + inv.profitDistributions.reduce((s, p) => s + p.shareAmount, 0), 0
  );

  const totalWithdrawn = investors.reduce((sum, inv) => 
    sum + inv.withdrawals.reduce((s, w) => s + w.amount, 0), 0
  );

  const totalInvestment = totalTeamRegularInvestment + totalTeamProfit;

  let activeLoanPrincipal = 0;
  loans.forEach((loan) => {
    const pendingSchedules = loan.schedule.filter(s => s.status === "pending");
    if (pendingSchedules.length > 0) {
      activeLoanPrincipal += pendingSchedules[0].openingPrincipal;
    }
  });

  const activeLoanCount = loans.length;
  const rawUnspentAmount = totalInvestment - totalWithdrawn - activeLoanPrincipal;
  const unspentAmount = adminRound(rawUnspentAmount);

  // 👈 EXPECTED CALCULATIONS
  let totalExpectedEMI = 0;
  expectedSchedules.forEach(sch => {
    totalExpectedEMI += (sch.termAmount + sch.interestAmount);
  });

  const activeInvestorsCount = investors.filter(i => i.status === "active").length;
  const expectedMonthlyInvestments = activeInvestorsCount * 1000;
  const extraExpectedAmount = extraIncomeRecord?.amount || 0;
  const grandTotalExpected = totalExpectedEMI + expectedMonthlyInvestments + extraExpectedAmount;

  const thisMonthDistributions = currentCycles.filter(
    d => new Date(d.cycle.cycleStart).getMonth() === currentMonth && new Date(d.cycle.cycleStart).getFullYear() === currentYear
  );

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Welcome, {session.user?.name || "Admin"}</h1>
          <p className="text-gray-500 mt-1 text-sm md:text-base">Namma Trust Financial Overview</p>
        </div>
        
        <div className="flex items-center gap-4">
	 <AdminShareCenter 
	    expectedEMI={totalExpectedEMI} 
            monthly1000={expectedMonthlyInvestments} 
            extraExpected={extraExpectedAmount} 
            grandTotal={grandTotalExpected} 
 />
          <NotificationBar />
          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs md:text-sm font-medium">
            {(session.user as any).role?.toUpperCase()}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
        <Link href="/dashboard/total-investment" className="block bg-white p-5 rounded-lg shadow-sm border-t-4 border-green-500 hover:scale-[1.02] transition-transform cursor-pointer">
          <p className="text-sm font-medium text-gray-500">Total Investment</p>
          <p className="text-2xl md:text-3xl font-bold text-gray-800 mt-2">₹{totalInvestment.toLocaleString("en-IN")}</p>
          <p className="text-xs text-gray-400 mt-2">Includes Accrued Profit</p>
        </Link>

        <div className="bg-white p-5 rounded-lg shadow-sm border-t-4 border-blue-500">
          <p className="text-sm font-medium text-gray-500">Total Team Regular Inv.</p>
          <p className="text-2xl md:text-3xl font-bold text-blue-600 mt-2">₹{totalTeamRegularInvestment.toLocaleString("en-IN")}</p>
          <p className="text-xs text-gray-400 mt-2">Actual Deposits Only</p>
        </div>

        <div className="bg-white p-5 rounded-lg shadow-sm border-t-4 border-purple-500">
          <p className="text-sm font-medium text-gray-500">Total Team Profit</p>
          <p className="text-2xl md:text-3xl font-bold text-purple-600 mt-2">₹{totalTeamProfit.toLocaleString("en-IN")}</p>
          <p className="text-xs text-gray-400 mt-2">Credited Profit</p>
        </div>

        <div className="bg-white p-5 rounded-lg shadow-sm border-t-4 border-orange-500">
          <p className="text-sm font-medium text-gray-500 flex items-center gap-1">Unspent Cash</p>
          <p className="text-2xl md:text-3xl font-bold text-orange-600 mt-2">₹{unspentAmount.toLocaleString("en-IN")}</p>
          <p className="text-xs text-gray-400 mt-2">Available Funds</p>
        </div>

        <div className="bg-white p-5 rounded-lg shadow-sm border-t-4 border-indigo-500">
          <p className="text-sm font-medium text-gray-500">Loan Disbursed (Active)</p>
          <p className="text-2xl md:text-3xl font-bold text-indigo-600 mt-2">₹{activeLoanPrincipal.toLocaleString("en-IN")}</p>
          <p className="text-xs text-gray-400 mt-2">Outstanding Principal</p>
        </div>

        <div className="bg-white p-5 rounded-lg shadow-sm border-t-4 border-gray-500">
          <p className="text-sm font-medium text-gray-500">Active Loans Count</p>
          <p className="text-2xl md:text-3xl font-bold text-gray-800 mt-2">{activeLoanCount}</p>
        </div>

        {/* 👈 NEW GRAND TOTAL EXPECTED CARD */}
        <div className="bg-teal-50 p-5 rounded-lg shadow-sm border border-teal-200 sm:col-span-2">
          <div className="flex justify-between items-center">
            <p className="text-sm font-bold text-teal-800">Total Expected This Month</p>
            <span className="text-xs bg-teal-600 text-white px-2 py-1 rounded font-bold">GRAND TOTAL</span>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-teal-700 mt-2">₹{grandTotalExpected.toLocaleString("en-IN")}</p>
          
          <div className="flex flex-col gap-1 mt-3 text-xs text-teal-700 bg-white/70 p-3 rounded">
            <div className="flex justify-between"><span>EMI Collections:</span> <span className="font-bold">₹{totalExpectedEMI.toLocaleString("en-IN")}</span></div>
            <div className="flex justify-between"><span>Monthly ₹1k Inv ({activeInvestorsCount} members):</span> <span className="font-bold">₹{expectedMonthlyInvestments.toLocaleString("en-IN")}</span></div>
            <div className="flex justify-between"><span>Extra Expected:</span> <span className="font-bold">₹{extraExpectedAmount.toLocaleString("en-IN")}</span></div>
          </div>
          
          <ExtraExpectedForm initialAmount={extraExpectedAmount} />
        </div>
      </div>

      {/* 👈 EXPECTED AMOUNT BREAKDOWN TABLE */}
      {expectedSchedules.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-8">
          <div className="p-4 border-b bg-teal-50 font-semibold text-teal-800 flex justify-between items-center">
            <span>EMI Collection Breakdown (Due This Month)</span>
            <span className="text-xs font-normal text-teal-600">Total: ₹{totalExpectedEMI.toLocaleString("en-IN")}</span>
          </div>
          
          <div className="hidden md:block">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3">Loan ID</th>
                  <th className="px-4 py-3">Investor</th>
                  <th className="px-4 py-3">Due Date</th>
                  <th className="px-4 py-3 text-right">Principal</th>
                  <th className="px-4 py-3 text-right">Interest</th>
                  <th className="px-4 py-3 text-right">Expected EMI</th>
                </tr>
              </thead>
              <tbody>
                {expectedSchedules.map((sch) => (
                  <tr key={sch.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-gray-500">{sch.loan.code || "N/A"}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{sch.loan.investor.name}</td>
                    <td className="px-4 py-3 text-gray-500">{new Date(sch.dueDate).toLocaleDateString("en-IN")}</td>
                    <td className="px-4 py-3 text-right text-blue-600">₹{sch.termAmount.toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3 text-right text-red-500">₹{sch.interestAmount.toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3 text-right font-bold text-teal-700">₹{(sch.termAmount + sch.interestAmount).toLocaleString("en-IN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden divide-y">
            {expectedSchedules.map((sch) => (
              <div key={sch.id} className="p-4 flex flex-col gap-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-800">{sch.loan.investor.name}</span>
                  <span className="font-bold text-teal-700">₹{(sch.termAmount + sch.interestAmount).toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Loan: {sch.loan.code || "N/A"}</span>
                  <span>Due: {new Date(sch.dueDate).toLocaleDateString("en-IN")}</span>
                </div>
                <div className="flex gap-4 text-xs mt-1">
                  <span className="text-blue-600">Principal: ₹{sch.termAmount}</span>
                  <span className="text-red-500">Interest: ₹{sch.interestAmount}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 md:p-5 border-b bg-gray-50 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-800">Recent Profit Distributions</h2>
          <Link href="/profits" className="text-sm text-blue-600 hover:underline font-medium">
            Manage Cycles
          </Link>
        </div>
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-600 font-medium">
            <tr>
              <th className="px-4 md:px-6 py-4">Investor</th>
              <th className="px-4 md:px-6 py-4 hidden md:table-cell">Date</th>
              <th className="px-4 md:px-6 py-4 text-right">Profit Credited</th>
            </tr>
          </thead>
          <tbody>
            {thisMonthDistributions.map((dist) => (
              <tr key={dist.id} className="border-t hover:bg-gray-50">
                <td className="px-4 md:px-6 py-4 font-medium text-gray-800">
                  <Link href={`/investors/${dist.investorId}`} className="hover:text-blue-600">
                    {dist.investor.name}
                  </Link>
                </td>
                <td className="px-4 md:px-6 py-4 text-gray-500 hidden md:table-cell">
                  {new Date(dist.cycle.distributedAt || dist.cycle.cycleStart).toLocaleDateString("en-IN")}
                </td>
                <td className="px-4 md:px-6 py-4 text-right font-bold text-green-600">
                  +₹{dist.shareAmount.toLocaleString("en-IN")}
                </td>
              </tr>
            ))}
            {thisMonthDistributions.length === 0 && (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                  No profit distributed this month yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
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
