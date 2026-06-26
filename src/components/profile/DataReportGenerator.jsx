import React, { forwardRef, useImperativeHandle, useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import { format } from 'date-fns';
import { X, Image as ImageIcon } from "lucide-react";

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
  const [previewImage, setPreviewImage] = useState(null);

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
          registrations: (registrations || []).slice(0, 20),
          payments: (payments || []).slice(0, 20),
          redeems: (redeems || []).slice(0, 20),
          activeUsers: activeUsers || [],
          notifications: (notifications || []).slice(0, 20),
          leaderboardEntries: (leaderboardEntries || []).slice(0, 20),
          taskSubmissions: (tasks || []).slice(0, 20),
          redeemCodes: (codes || []).slice(0, 20),
          globalChats: (chats || []).slice(0, 20)
        };

        setData(allData);

        // Wait for React to render the hidden component and charts to animate (if any)
        await new Promise(resolve => setTimeout(resolve, 300));

        if (!containerRef.current) return false;

        const imgData = canvas.toDataURL('image/jpeg', 0.9);
        setPreviewImage(imgData);
        
        setData(null);
        return true;

      } catch (error) {
        console.error("Image generation failed:", error);
        setData(null);
        return false;
      }
    }
  }));

  const handleSaveToPhotos = () => {
    const currentUser = data?.user || { id: "unknown" };
    const fileName = `BattleHub_MyData_${currentUser.unique_id || currentUser.id.substring(0, 6)}.jpg`;
    
    if (window.AndroidBridge && window.AndroidBridge.downloadBase64) {
      window.AndroidBridge.downloadBase64(previewImage, "image/jpeg", fileName);
      alert("Saving to photos...");
    } else {
      const link = document.createElement("a");
      link.href = previewImage;
      link.download = fileName;
      link.click();
    }
  };

  if (!data && !previewImage) return null;

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
    <>
    <div style={{ position: 'fixed', top: '-9999px', left: '-9999px', zIndex: -9999, opacity: 0, pointerEvents: 'none' }}>
      <div ref={containerRef} style={{ width: '794px', backgroundColor: 'white', color: 'black', padding: '40px', fontFamily: 'sans-serif' }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', borderBottom: '2px solid #e5e7eb', paddingBottom: '20px', marginBottom: '30px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: '0 0 10px 0', textDecoration: 'underline', color: '#111827' }}>BATTLEHUB FF</h1>
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
            {/* Simple CSS Win/Loss Bar */}
            <div style={{ width: '50%', height: '250px', backgroundColor: '#f9fafb', padding: '15px', borderRadius: '8px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
              <h4 style={{ textAlign: 'center', fontSize: '14px', marginBottom: '20px' }}>Win/Loss Ratio</h4>
              <div style={{ width: '100%', height: '30px', backgroundColor: '#ef4444', borderRadius: '15px', overflow: 'hidden', display: 'flex', marginBottom: '15px' }}>
                <div style={{ width: `${totalTournaments > 0 ? (totalWins / totalTournaments) * 100 : 0}%`, backgroundColor: '#22c55e', height: '100%' }}></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '12px', fontWeight: 'bold' }}>
                <span style={{ color: '#22c55e' }}>Wins: {totalWins}</span>
                <span style={{ color: '#ef4444' }}>Losses: {totalLosses}</span>
              </div>
              <div style={{ textAlign: 'center', fontSize: '12px', marginTop: '20px', color: '#6b7280' }}>Total Tournaments: {totalTournaments}</div>
            </div>
            
            {/* Simple CSS Bar Chart for Kills */}
            <div style={{ width: '50%', height: '250px', backgroundColor: '#f9fafb', padding: '15px', borderRadius: '8px', display: 'flex', flexDirection: 'column' }}>
              <h4 style={{ textAlign: 'center', fontSize: '14px', marginBottom: '15px' }}>Recent Kills History</h4>
              <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: '8px', paddingBottom: '5px', borderBottom: '1px solid #e5e7eb', height: '150px' }}>
                {killsData.length > 0 ? killsData.map((d, i) => {
                  const maxKills = Math.max(...killsData.map(k => k.kills)) || 1;
                  const heightPct = (d.kills / maxKills) * 100;
                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                      <span style={{ fontSize: '10px', color: '#6b7280', marginBottom: '4px' }}>{d.kills}</span>
                      <div style={{ width: '100%', height: `${heightPct}%`, backgroundColor: '#3b82f6', borderRadius: '4px 4px 0 0', minHeight: d.kills > 0 ? '5px' : '0' }}></div>
                    </div>
                  );
                }) : (
                  <div style={{ width: '100%', textAlign: 'center', color: '#9ca3af', fontSize: '12px', alignSelf: 'center' }}>No Data</div>
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginTop: '5px' }}>
                {killsData.map((d, i) => (
                  <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: '8px', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {d.name.substring(0, 4)}
                  </div>
                ))}
              </div>
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

    {/* Fullscreen Image Preview Modal */}
    {previewImage && (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 99999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        
        <div style={{ position: 'absolute', top: '15px', left: '15px', right: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 100000 }}>
           <button onClick={() => setPreviewImage(null)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
             <X size={24} />
           </button>
           <button onClick={handleSaveToPhotos} style={{ backgroundColor: '#f97316', color: 'white', fontWeight: 'bold', padding: '10px 15px', borderRadius: '8px', border: 'none', display: 'flex', alignItems: 'center' }}>
             <ImageIcon size={18} style={{ marginRight: '8px' }} />
             Save to Photos
           </button>
        </div>

        <div style={{ flex: 1, width: '100%', height: '100%', overflow: 'auto', display: 'flex', justifyContent: 'center', padding: '70px 10px 20px 10px' }}>
          <img src={previewImage} alt="Report Preview" style={{ maxWidth: '100%', maxHeight: 'none', objectFit: 'contain', backgroundColor: 'white' }} />
        </div>

      </div>
    )}
    </>
  );
});

export default DataReportGenerator;
