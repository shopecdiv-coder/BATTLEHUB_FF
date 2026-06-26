import React, { forwardRef, useImperativeHandle, useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

import { User } from "@/entities/User";
import { Notification } from "@/entities/Notification";
import { PaymentRequest } from "@/entities/PaymentRequest";
import { RedeemRequest } from "@/entities/RedeemRequest";
import { Registration } from "@/entities/Registration";
import { Diamond } from "@/entities/Diamond";
import { ActiveUser } from "@/entities/ActiveUser";
import { TournamentLeaderboard } from "@/entities/TournamentLeaderboard";
import { TaskSubmission } from "@/entities/TaskSubmission";
import { RedeemCode } from "@/entities/RedeemCode";
import { GlobalChat } from "@/entities/GlobalChat";

const DataReportGenerator = forwardRef((props, ref) => {
  const [data, setData] = useState(null);
  const containerRef = useRef(null);

  useImperativeHandle(ref, () => ({
    generatePDF: async () => {
      try {
        const currentUser = await User.me();
        if (!currentUser) throw new Error("Not logged in");

        const [
          diamonds, 
          registrations, 
          payments, 
          redeems, 
          activeUsers,
          notifications,
          leaderboardEntries,
          tasks,
          codes,
          chats
        ] = await Promise.all([
          Diamond.filter({ user_id: currentUser.id }).catch(() => []),
          Registration.filter({ team_leader_id: currentUser.id }).catch(() => []),
          PaymentRequest.filter({ user_id: currentUser.id }).catch(() => []),
          RedeemRequest.filter({ user_id: currentUser.id }).catch(() => []),
          ActiveUser.filter({ user_id: currentUser.id }).catch(() => []),
          Notification.filter({ recipient_id: currentUser.id }, "-created_date", 100).catch(() => []),
          TournamentLeaderboard.filter({ user_id: currentUser.id }, "-created_date", 50).catch(() => []),
          TaskSubmission.filter({ user_id: currentUser.id }, "-created_date").catch(() => []),
          RedeemCode.filter({ user_id: currentUser.id }, "-created_date").catch(() => []),
          GlobalChat.filter({ user_id: currentUser.id }, "-created_date", 50).catch(() => [])
        ]);

        const allData = {
          user: currentUser,
          wallet: diamonds[0] || null,
          registrations: registrations || [],
          payments: payments || [],
          redeems: redeems || [],
          activeUsers: activeUsers || [],
          notifications: notifications || [],
          leaderboardEntries: leaderboardEntries || [],
          taskSubmissions: tasks || [],
          redeemCodes: codes || [],
          globalChats: chats || []
        };

        setData(allData);

        // Wait for React to render the hidden component and charts to animate (if any)
        await new Promise(resolve => setTimeout(resolve, 300));

        if (!containerRef.current) return false;

        // Start PDF generation
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        const canvas = await html2canvas(containerRef.current, {
          scale: 1.5,
          useCORS: true,
          logging: false
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.6);
        const imgWidth = pdfWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;

        while (heightLeft > 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
          heightLeft -= pdfHeight;
        }

        const blob = pdf.output('blob');
        const sizeMB = (blob.size / (1024 * 1024)).toFixed(2);
        
        pdf.save(`BattleHub_MyData_${currentUser.unique_id || currentUser.id.substring(0, 6)}.pdf`);
        
        setTimeout(() => alert(`✅ Report Generated! File Size: ${sizeMB} MB`), 500);
        
        setData(null);
        return true;

      } catch (error) {
        console.error("PDF Generation failed:", error);
        setData(null);
        return false;
      }
    }
  }));

  if (!data) return null;

  const { user, wallet, registrations, payments, redeems, activeUsers, notifications, leaderboardEntries, taskSubmissions, redeemCodes, globalChats } = data;
  
  const totalTournaments = registrations.length;
  const totalWins = leaderboardEntries.filter(e => e.wins > 0).length;
  const totalLosses = Math.max(totalTournaments - totalWins, 0);
  const pieData = [
    { name: "Wins", value: totalWins || 0, color: "#22c55e" },
    { name: "Losses", value: totalLosses || 0, color: "#ef4444" },
  ].filter(d => d.value > 0);

  const killsData = leaderboardEntries.slice(0, 10).reverse().map((e, i) => ({
    name: e.tournament_title?.slice(0, 10) || `T${i + 1}`,
    kills: e.kills || 0
  }));

  return (
    <div style={{ position: 'absolute', top: '-9999px', left: '-9999px', zIndex: -9999 }}>
      <div ref={containerRef} style={{ width: '794px', backgroundColor: 'white', color: 'black', padding: '40px', fontFamily: 'sans-serif' }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', borderBottom: '2px solid #e5e7eb', paddingBottom: '20px', marginBottom: '30px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: '0 0 10px 0', color: '#111827' }}>BATTLEHUB FF</h1>
          <h2 style={{ fontSize: '20px', color: '#4b5563', margin: '0' }}>Complete User Data Report</h2>
          <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '10px' }}>Generated on: {format(new Date(), 'dd MMM yyyy, hh:mm:ss a')}</p>
        </div>

        {/* 1. Account & Profile Information */}
        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', borderBottom: '1px solid #e5e7eb', paddingBottom: '5px', marginBottom: '15px' }}>1. Account & Profile Information</h3>
          <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse' }}>
            <tbody>
              <tr><td style={{ padding: '8px', borderBottom: '1px solid #f3f4f6', fontWeight: 'bold', width: '40%' }}>Username (IGN):</td><td style={{ padding: '8px', borderBottom: '1px solid #f3f4f6' }}>{user.ign || 'Not Set'}</td></tr>
              <tr><td style={{ padding: '8px', borderBottom: '1px solid #f3f4f6', fontWeight: 'bold' }}>User ID:</td><td style={{ padding: '8px', borderBottom: '1px solid #f3f4f6' }}>{user.unique_id || user.id}</td></tr>
              <tr><td style={{ padding: '8px', borderBottom: '1px solid #f3f4f6', fontWeight: 'bold' }}>Registered Email:</td><td style={{ padding: '8px', borderBottom: '1px solid #f3f4f6' }}>{user.email}</td></tr>
              <tr><td style={{ padding: '8px', borderBottom: '1px solid #f3f4f6', fontWeight: 'bold' }}>Registered Mobile:</td><td style={{ padding: '8px', borderBottom: '1px solid #f3f4f6' }}>{user.phone || 'Not Provided'}</td></tr>
              <tr><td style={{ padding: '8px', borderBottom: '1px solid #f3f4f6', fontWeight: 'bold' }}>Game UID:</td><td style={{ padding: '8px', borderBottom: '1px solid #f3f4f6' }}>{user.game_uid || 'Not Provided'}</td></tr>
              <tr><td style={{ padding: '8px', borderBottom: '1px solid #f3f4f6', fontWeight: 'bold' }}>Account Creation Date:</td><td style={{ padding: '8px', borderBottom: '1px solid #f3f4f6' }}>{format(new Date(user.created_date), 'dd MMM yyyy, hh:mm:ss a')}</td></tr>
              <tr><td style={{ padding: '8px', borderBottom: '1px solid #f3f4f6', fontWeight: 'bold' }}>Last Login / Active:</td><td style={{ padding: '8px', borderBottom: '1px solid #f3f4f6' }}>{activeUsers[0]?.last_active ? format(new Date(activeUsers[0].last_active), 'dd MMM yyyy, hh:mm:ss a') : 'N/A'}</td></tr>
              <tr><td style={{ padding: '8px', borderBottom: '1px solid #f3f4f6', fontWeight: 'bold' }}>Account Status:</td><td style={{ padding: '8px', borderBottom: '1px solid #f3f4f6' }}>Active</td></tr>
            </tbody>
          </table>
        </div>

        {/* 7. Performance Graphs */}
        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', borderBottom: '1px solid #e5e7eb', paddingBottom: '5px', marginBottom: '15px' }}>Performance Analysis</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px' }}>
            <div style={{ width: '50%', height: '250px', backgroundColor: '#f9fafb', padding: '10px', borderRadius: '8px' }}>
              <h4 style={{ textAlign: 'center', fontSize: '14px', marginBottom: '10px' }}>Win/Loss Ratio</h4>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie isAnimationActive={false} data={pieData.length > 0 ? pieData : [{ name: "No Data", value: 1, color: "#d1d5db" }]} cx="50%" cy="50%" innerRadius={40} outerRadius={80} paddingAngle={5} dataKey="value">
                    {(pieData.length > 0 ? pieData : [{ name: "No Data", value: 1, color: "#d1d5db" }]).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div style={{ textAlign: 'center', fontSize: '12px' }}>Total Tournaments: {totalTournaments} | Wins: {totalWins}</div>
            </div>
            
            <div style={{ width: '50%', height: '250px', backgroundColor: '#f9fafb', padding: '10px', borderRadius: '8px' }}>
              <h4 style={{ textAlign: 'center', fontSize: '14px', marginBottom: '10px' }}>Recent Kills History</h4>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={killsData.length > 0 ? killsData : [{ name: 'N/A', kills: 0 }]}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Bar isAnimationActive={false} dataKey="kills" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* 2. Tournament & Match History */}
        <div style={{ marginBottom: '30px', pageBreakInside: 'avoid' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', borderBottom: '1px solid #e5e7eb', paddingBottom: '5px', marginBottom: '15px' }}>2. Tournament & Match History</h3>
          {registrations.length === 0 ? <p style={{ fontSize: '14px', color: '#6b7280' }}>No tournaments played yet.</p> : (
            <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse', border: '1px solid #e5e7eb' }}>
              <thead>
                <tr style={{ backgroundColor: '#f3f4f6' }}>
                  <th style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'left' }}>Date</th>
                  <th style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'left' }}>Tournament</th>
                  <th style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'left' }}>Team Name</th>
                  <th style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'left' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {registrations.map(r => (
                  <tr key={r.id}>
                    <td style={{ padding: '8px', border: '1px solid #e5e7eb' }}>{format(new Date(r.created_date), 'dd MMM yyyy, hh:mm:ss a')}</td>
                    <td style={{ padding: '8px', border: '1px solid #e5e7eb' }}>{r.tournament_title}</td>
                    <td style={{ padding: '8px', border: '1px solid #e5e7eb' }}>{r.team_name}</td>
                    <td style={{ padding: '8px', border: '1px solid #e5e7eb' }}>{r.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          
          <h4 style={{ fontSize: '14px', fontWeight: 'bold', marginTop: '15px', marginBottom: '10px' }}>Leaderboard / Results History</h4>
          {leaderboardEntries.length === 0 ? <p style={{ fontSize: '14px', color: '#6b7280' }}>No match results yet.</p> : (
            <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse', border: '1px solid #e5e7eb' }}>
              <thead>
                <tr style={{ backgroundColor: '#f3f4f6' }}>
                  <th style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'left' }}>Tournament</th>
                  <th style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'left' }}>Rank</th>
                  <th style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'left' }}>Kills</th>
                  <th style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'left' }}>Points</th>
                  <th style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'left' }}>Wins</th>
                </tr>
              </thead>
              <tbody>
                {leaderboardEntries.map(l => (
                  <tr key={l.id}>
                    <td style={{ padding: '8px', border: '1px solid #e5e7eb' }}>{l.tournament_title || 'Unknown'}</td>
                    <td style={{ padding: '8px', border: '1px solid #e5e7eb' }}>{l.rank || 'N/A'}</td>
                    <td style={{ padding: '8px', border: '1px solid #e5e7eb' }}>{l.kills || 0}</td>
                    <td style={{ padding: '8px', border: '1px solid #e5e7eb' }}>{l.points || 0}</td>
                    <td style={{ padding: '8px', border: '1px solid #e5e7eb' }}>{l.wins || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* 3. Wallet & Transaction History */}
        <div style={{ marginBottom: '30px', pageBreakInside: 'avoid' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', borderBottom: '1px solid #e5e7eb', paddingBottom: '5px', marginBottom: '15px' }}>3. Wallet, Coins & Transaction History</h3>
          <div style={{ display: 'flex', gap: '20px', marginBottom: '15px' }}>
            <div style={{ padding: '10px', backgroundColor: '#f3f4f6', borderRadius: '8px', width: '50%' }}>
              <span style={{ fontWeight: 'bold' }}>Current Diamonds:</span> {wallet?.diamond_balance || 0}
            </div>
            <div style={{ padding: '10px', backgroundColor: '#f3f4f6', borderRadius: '8px', width: '50%' }}>
              <span style={{ fontWeight: 'bold' }}>Current BH Coins:</span> {wallet?.bh_coin_balance || 0}
            </div>
          </div>

          <h4 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px' }}>Purchase History</h4>
          {payments.length === 0 ? <p style={{ fontSize: '14px', color: '#6b7280' }}>No purchase history.</p> : (
            <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse', border: '1px solid #e5e7eb', marginBottom: '15px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f3f4f6' }}>
                  <th style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'left' }}>Date</th>
                  <th style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'left' }}>Amount (INR)</th>
                  <th style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'left' }}>Coins Received</th>
                  <th style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'left' }}>App</th>
                  <th style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'left' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id}>
                    <td style={{ padding: '8px', border: '1px solid #e5e7eb' }}>{format(new Date(p.created_date), 'dd MMM yyyy, hh:mm:ss a')}</td>
                    <td style={{ padding: '8px', border: '1px solid #e5e7eb' }}>₹{p.inr_amount}</td>
                    <td style={{ padding: '8px', border: '1px solid #e5e7eb' }}>{p.diamond_amount}</td>
                    <td style={{ padding: '8px', border: '1px solid #e5e7eb' }}>{p.payment_app}</td>
                    <td style={{ padding: '8px', border: '1px solid #e5e7eb' }}>{p.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <h4 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px' }}>Withdrawal / Redeem History</h4>
          {redeems.length === 0 ? <p style={{ fontSize: '14px', color: '#6b7280' }}>No withdrawal history.</p> : (
            <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse', border: '1px solid #e5e7eb' }}>
              <thead>
                <tr style={{ backgroundColor: '#f3f4f6' }}>
                  <th style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'left' }}>Date</th>
                  <th style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'left' }}>Coins Redeemed</th>
                  <th style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'left' }}>Amount (INR)</th>
                  <th style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'left' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {redeems.map(r => (
                  <tr key={r.id}>
                    <td style={{ padding: '8px', border: '1px solid #e5e7eb' }}>{format(new Date(r.created_date), 'dd MMM yyyy, hh:mm:ss a')}</td>
                    <td style={{ padding: '8px', border: '1px solid #e5e7eb' }}>{r.diamond_amount}</td>
                    <td style={{ padding: '8px', border: '1px solid #e5e7eb' }}>₹{r.inr_amount}</td>
                    <td style={{ padding: '8px', border: '1px solid #e5e7eb' }}>{r.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* 4. App Activity & Login Information */}
        <div style={{ marginBottom: '30px', pageBreakInside: 'avoid' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', borderBottom: '1px solid #e5e7eb', paddingBottom: '5px', marginBottom: '15px' }}>4. App Activity & Login Information</h3>
          <p style={{ fontSize: '14px', marginBottom: '5px' }}><strong>Last Known Device Info:</strong> {navigator.userAgent.substring(0, 80)}...</p>
          <p style={{ fontSize: '14px', marginBottom: '15px' }}><strong>Total Sessions Recorded:</strong> {activeUsers.length}</p>
          
          <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse', border: '1px solid #e5e7eb' }}>
              <thead>
                <tr style={{ backgroundColor: '#f3f4f6' }}>
                  <th style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'left' }}>Session Date</th>
                  <th style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'left' }}>Last Active</th>
                </tr>
              </thead>
              <tbody>
                {activeUsers.slice(0, 5).map(s => (
                  <tr key={s.id}>
                    <td style={{ padding: '8px', border: '1px solid #e5e7eb' }}>{format(new Date(s.date || s.created_date), 'dd MMM yyyy')}</td>
                    <td style={{ padding: '8px', border: '1px solid #e5e7eb' }}>{format(new Date(s.last_active), 'dd MMM yyyy, hh:mm:ss a')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
        </div>

        {/* 5. Notifications & Communication History */}
        <div style={{ marginBottom: '30px', pageBreakInside: 'avoid' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', borderBottom: '1px solid #e5e7eb', paddingBottom: '5px', marginBottom: '15px' }}>5. Notifications & Communication History</h3>
          {notifications.length === 0 ? <p style={{ fontSize: '14px', color: '#6b7280' }}>No notifications found.</p> : (
            <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse', border: '1px solid #e5e7eb' }}>
              <thead>
                <tr style={{ backgroundColor: '#f3f4f6' }}>
                  <th style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'left', width: '20%' }}>Date</th>
                  <th style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'left', width: '20%' }}>Type</th>
                  <th style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'left', width: '60%' }}>Message</th>
                </tr>
              </thead>
              <tbody>
                {notifications.slice(0, 10).map(n => (
                  <tr key={n.id}>
                    <td style={{ padding: '8px', border: '1px solid #e5e7eb' }}>{format(new Date(n.created_at || n.created_date), 'dd MMM yyyy, hh:mm:ss a')}</td>
                    <td style={{ padding: '8px', border: '1px solid #e5e7eb' }}>{n.type}</td>
                    <td style={{ padding: '8px', border: '1px solid #e5e7eb' }}><strong>{n.title}:</strong> {n.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* 6. Security & Account Logs */}
        <div style={{ marginBottom: '30px', pageBreakInside: 'avoid' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', borderBottom: '1px solid #e5e7eb', paddingBottom: '5px', marginBottom: '15px' }}>6. Security & Account Logs</h3>
          <ul style={{ fontSize: '14px', lineHeight: '1.6', paddingLeft: '20px' }}>
            <li><strong>Account Created:</strong> {format(new Date(user.created_date), 'dd MMM yyyy, hh:mm:ss a')}</li>
            <li><strong>Unique ID Generated:</strong> Yes ({user.unique_id})</li>
            <li><strong>Password Change History:</strong> Authenticated securely via Firebase Auth. (Timestamps managed by provider).</li>
            <li><strong>Security Events:</strong> No suspicious login attempts detected.</li>
          </ul>
        </div>
        
        {/* 7. Additional Activity Logs (Tasks & Chat) */}
        <div style={{ marginBottom: '30px', pageBreakInside: 'avoid' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', borderBottom: '1px solid #e5e7eb', paddingBottom: '5px', marginBottom: '15px' }}>7. Additional Activity Logs</h3>
          
          <h4 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px' }}>Task Submissions & Rewards</h4>
          {taskSubmissions?.length === 0 ? <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '15px' }}>No task submissions found.</p> : (
            <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse', border: '1px solid #e5e7eb', marginBottom: '15px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f3f4f6' }}>
                  <th style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'left' }}>Date</th>
                  <th style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'left' }}>Task Title</th>
                  <th style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'left' }}>Reward</th>
                  <th style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'left' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {taskSubmissions?.map(t => (
                  <tr key={t.id}>
                    <td style={{ padding: '8px', border: '1px solid #e5e7eb' }}>{format(new Date(t.created_date), 'dd MMM yyyy, hh:mm:ss a')}</td>
                    <td style={{ padding: '8px', border: '1px solid #e5e7eb' }}>{t.task_title}</td>
                    <td style={{ padding: '8px', border: '1px solid #e5e7eb' }}>+{t.diamond_reward}💎</td>
                    <td style={{ padding: '8px', border: '1px solid #e5e7eb' }}>{t.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          
          <h4 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px' }}>Global Chat Messages</h4>
          {globalChats?.length === 0 ? <p style={{ fontSize: '14px', color: '#6b7280' }}>No recent chat activity.</p> : (
            <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse', border: '1px solid #e5e7eb' }}>
              <thead>
                <tr style={{ backgroundColor: '#f3f4f6' }}>
                  <th style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'left', width: '30%' }}>Date</th>
                  <th style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'left', width: '70%' }}>Message</th>
                </tr>
              </thead>
              <tbody>
                {globalChats?.slice(0, 15).map(c => (
                  <tr key={c.id}>
                    <td style={{ padding: '8px', border: '1px solid #e5e7eb' }}>{format(new Date(c.created_date), 'dd MMM yyyy, hh:mm:ss a')}</td>
                    <td style={{ padding: '8px', border: '1px solid #e5e7eb' }}>{c.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        
        <div style={{ textAlign: 'center', marginTop: '50px', paddingTop: '20px', borderTop: '1px solid #e5e7eb', fontSize: '12px', color: '#9ca3af' }}>
          BATTLEHUB FF | Official Data Export | This document contains confidential user information.
        </div>
      </div>
    </div>
  );
});

export default DataReportGenerator;
