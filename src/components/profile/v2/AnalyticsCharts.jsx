import React, { useState, useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { Eye, ThumbsUp, MessageSquare, TrendingUp, Play, Clock, Film, Video, BarChart2, X, ArrowLeft, Calendar, Zap, Share2, Bookmark, Users } from 'lucide-react';

// ─────────────────────────────────────────────────────────
// CUSTOM TOOLTIP
// ─────────────────────────────────────────────────────────
const GlassTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0a0d14]/95 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl p-3 text-xs min-w-[130px]">
      <p className="text-gray-400 font-semibold mb-2 border-b border-white/10 pb-1.5">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-4 mt-1.5">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color || p.fill }} />
            <span className="text-gray-400">{p.name}</span>
          </div>
          <span className="font-black text-white">{p.value?.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────
// CARD WRAPPER
// ─────────────────────────────────────────────────────────
const Card = ({ children, className = '' }) => (
  <div className={`bg-[#0d1117] border border-white/5 rounded-2xl overflow-hidden ${className}`}>{children}</div>
);
const CardHead = ({ title, subtitle, right }) => (
  <div className="px-5 pt-5 pb-0 flex items-start justify-between">
    <div>
      <div className="flex items-center gap-2">
        <div className="w-1 h-4 rounded-full bg-red-500" />
        <h3 className="text-xs font-black text-white uppercase tracking-widest">{title}</h3>
      </div>
      {subtitle && <p className="text-[10px] text-gray-500 mt-0.5 ml-3">{subtitle}</p>}
    </div>
    {right}
  </div>
);

// ─────────────────────────────────────────────────────────
// VIDEO ANALYTICS MODAL
// ─────────────────────────────────────────────────────────
function VideoAnalyticsModal({ post, onClose, allPosts }) {
  const likes    = Array.isArray(post.likes) ? post.likes.length : (post.likes || 0);
  const comments = post.comments_count || 0;
  const views    = post.views || 0;
  const er       = views > 0 ? (((likes + comments) / views) * 100).toFixed(1) : '0.0';
  const watchTime = post.watch_time || Math.floor(views * 0.05);

  // Simulated daily trend based on post date (spikes on upload day, fades)
  const dailyTrend = useMemo(() => {
    const data = [];
    const postDate = new Date(post.created_at || new Date());
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const daysDiff = Math.round((d - postDate) / 86400000);
      let v = 0;
      if (daysDiff >= 0) {
        if (daysDiff === 0) v = Math.round(views * 0.45);
        else if (daysDiff === 1) v = Math.round(views * 0.25);
        else if (daysDiff === 2) v = Math.round(views * 0.12);
        else if (daysDiff <= 5)  v = Math.round(views * 0.04);
        else                      v = Math.round(views * 0.01);
      }
      data.push({ date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), views: v });
    }
    return data;
  }, [post, views]);

  // Rank among all posts
  const sorted = [...allPosts].sort((a, b) => (b.views || 0) - (a.views || 0));
  const rank = sorted.findIndex(p => p.id === post.id) + 1;

  const RANK_COLOR = rank === 1 ? '#fbbf24' : rank === 2 ? '#94a3b8' : rank === 3 ? '#f97316' : '#6b7280';

  return (
    <div className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative bg-[#090d14] border border-white/10 rounded-t-3xl sm:rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl z-10 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full">

        {/* Header */}
        <div className="sticky top-0 bg-[#090d14]/95 backdrop-blur border-b border-white/5 px-5 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
              <ArrowLeft className="w-4 h-4 text-gray-400" />
            </button>
            <div>
              <p className="text-xs font-black text-white uppercase tracking-wide">Video Analytics</p>
              <p className="text-[9px] text-gray-500">Full breakdown</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div className="p-5 space-y-5">

          {/* Video Info Card */}
          <div className="flex gap-4">
            <div className="relative w-28 h-20 rounded-xl overflow-hidden shrink-0 bg-gray-900">
              {post.thumbnail_url
                ? <img src={post.thumbnail_url} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center"><Film className="w-8 h-8 text-gray-700" /></div>
              }
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <div className="absolute bottom-2 left-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                <Play className="w-3 h-3 text-white fill-white" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-black text-white leading-snug line-clamp-2">{post.title}</h2>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-white/5 text-gray-400 border border-white/10">
                  {post.type === 'reel' ? 'Short' : 'Video'}
                </span>
                <span className="text-[9px] text-gray-500 flex items-center gap-1">
                  <Calendar className="w-2.5 h-2.5" />
                  {new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                {rank > 0 && (
                  <span className="text-[9px] font-black px-2 py-0.5 rounded-full" style={{ backgroundColor: RANK_COLOR + '20', color: RANK_COLOR }}>
                    #{rank} on Channel
                  </span>
                )}
              </div>
              <div className={`text-[9px] mt-1.5 font-bold uppercase flex items-center gap-1 ${post.status === 'private' ? 'text-gray-500' : 'text-emerald-400'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${post.status === 'private' ? 'bg-gray-500' : 'bg-emerald-400'}`} />
                {post.status || 'Published'}
              </div>
            </div>
          </div>

          {/* KPI Grid */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: Eye,           label: 'Total Views',       value: views,     color: '#ef4444' },
              { icon: ThumbsUp,      label: 'Likes',             value: likes,     color: '#f97316' },
              { icon: MessageSquare, label: 'Comments',          value: comments,  color: '#3b82f6' },
              { icon: Zap,           label: 'Engagement Rate',   value: `${er}%`,  color: '#8b5cf6' },
              { icon: Clock,         label: 'Watch Time (hrs)',  value: watchTime, color: '#10b981' },
              { icon: Share2,        label: 'Shares',            value: post.shares || 0, color: '#06b6d4' },
            ].map((s, i) => (
              <div key={i} className="relative overflow-hidden bg-[#111827] border border-white/5 rounded-xl p-3 flex items-center gap-3">
                <div className="absolute inset-0 opacity-10" style={{ background: `radial-gradient(circle at 20% 50%, ${s.color}, transparent 60%)` }} />
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: s.color + '20' }}>
                  <s.icon className="w-4 h-4" style={{ color: s.color }} />
                </div>
                <div>
                  <p className="text-sm font-black text-white">{typeof s.value === 'number' ? s.value.toLocaleString() : s.value}</p>
                  <p className="text-[8px] font-bold text-gray-500 uppercase tracking-wider">{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Views Trend Chart */}
          <div className="bg-[#111827] border border-white/5 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-4 rounded-full bg-red-500" />
              <p className="text-[10px] font-black text-white uppercase tracking-widest">Views Trend</p>
              <span className="ml-auto text-[9px] text-gray-600 font-bold">Last 14 Days</span>
            </div>
            <ResponsiveContainer width="100%" height={150}>
              <AreaChart data={dailyTrend} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="vGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#ef4444" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff06" vertical={false} />
                <XAxis dataKey="date" stroke="#374151" tick={{ fontSize: 8, fill: '#6b7280' }} axisLine={false} tickLine={false} interval={3} />
                <YAxis hide />
                <Tooltip content={<GlassTooltip />} cursor={{ stroke: '#ffffff10' }} />
                <Area type="monotone" dataKey="views" name="Views" stroke="#ef4444" strokeWidth={2} fill="url(#vGrad)"
                  dot={false} activeDot={{ r: 4, fill: '#ef4444', stroke: '#fff', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Engagement Breakdown Bar */}
          <div className="bg-[#111827] border border-white/5 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-4 rounded-full bg-orange-500" />
              <p className="text-[10px] font-black text-white uppercase tracking-widest">Engagement Breakdown</p>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Like Rate',    value: views > 0 ? ((likes / views) * 100).toFixed(1) : 0,    color: '#f97316', max: 20 },
                { label: 'Comment Rate', value: views > 0 ? ((comments / views) * 100).toFixed(2) : 0,  color: '#3b82f6', max: 5 },
                { label: 'Overall ER',   value: parseFloat(er),                                           color: '#8b5cf6', max: 25 },
              ].map((s, i) => (
                <div key={i}>
                  <div className="flex justify-between mb-1">
                    <span className="text-[10px] font-bold text-gray-400">{s.label}</span>
                    <span className="text-[10px] font-black text-white">{s.value}%</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${Math.min(100, (s.value / s.max) * 100)}%`, backgroundColor: s.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Performance Score */}
          <div className="bg-gradient-to-br from-[#1a0533] to-[#0e0b1a] border border-violet-500/20 rounded-2xl p-4 text-center">
            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Performance Score</p>
            <p className="text-4xl font-black text-white">
              {Math.min(100, Math.round(
                (views > 0 ? Math.log10(views + 1) * 15 : 0) +
                parseFloat(er) * 3 +
                (rank === 1 ? 20 : rank <= 3 ? 10 : 5)
              ))}
            </p>
            <p className="text-[9px] text-violet-400 font-bold mt-1">out of 100</p>
            <p className="text-[9px] text-gray-600 mt-1">Based on views, engagement & channel rank</p>
          </div>

        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────
export default function AnalyticsCharts({ posts = [], followerCount = 0 }) {
  const [timeRange, setTimeRange] = useState(28);
  const [selectedPost, setSelectedPost] = useState(null);

  const totalViews    = posts.reduce((s, p) => s + (p.views || 0), 0);
  const totalLikes    = posts.reduce((s, p) => s + (Array.isArray(p.likes) ? p.likes.length : (p.likes || 0)), 0);
  const totalComments = posts.reduce((s, p) => s + (p.comments_count || 0), 0);
  const totalPosts    = posts.length;
  const engagementRate = totalViews > 0 ? (((totalLikes + totalComments) / totalViews) * 100).toFixed(1) : '0.0';
  const bestPost = [...posts].sort((a, b) => (b.views || 0) - (a.views || 0))[0];

  // Trend data
  const trendData = useMemo(() => {
    let points = timeRange;
    const isHourly  = timeRange === 1;
    const isMonthly = [180, 365, 730].includes(timeRange);
    if (isHourly)         points = 24;
    else if (timeRange === 180) points = 6;
    else if (timeRange === 365) points = 12;
    else if (timeRange === 730) points = 24;

    const labelFmt = isHourly ? { hour: '2-digit', minute: '2-digit' }
      : isMonthly ? { month: 'short', year: '2-digit' }
      : { month: 'short', day: 'numeric' };

    const agg = {};
    for (let i = points; i >= 0; i--) {
      const d = new Date();
      if (isHourly)       { d.setHours(d.getHours() - i); d.setMinutes(0, 0, 0); }
      else if (isMonthly) { d.setMonth(d.getMonth() - i); d.setDate(1); d.setHours(0,0,0,0); }
      else                { d.setDate(d.getDate() - i); d.setHours(0,0,0,0); }
      agg[d.getTime()] = { label: d.toLocaleString('en-US', labelFmt), views: 0, likes: 0, comments: 0 };
    }
    const keys = Object.keys(agg).map(Number).sort((a, b) => a - b);
    posts.forEach(post => {
      const pt = new Date(post.created_at || new Date()).getTime();
      for (let i = 0; i < keys.length; i++) {
        if (pt >= keys[i] && (!keys[i+1] || pt < keys[i+1])) {
          agg[keys[i]].views    += (post.views || 0);
          agg[keys[i]].likes    += (Array.isArray(post.likes) ? post.likes.length : (post.likes || 0));
          agg[keys[i]].comments += (post.comments_count || 0);
          break;
        }
      }
    });
    return keys.map(k => ({ date: agg[k].label, views: agg[k].views, likes: agg[k].likes, comments: agg[k].comments }));
  }, [timeRange, posts]);

  const typeData = [
    { name: 'Videos',    value: posts.filter(p => p.type === 'video').length,     color: '#ef4444' },
    { name: 'Shorts',    value: posts.filter(p => p.type === 'reel').length,      color: '#f97316' },
    { name: 'Community', value: posts.filter(p => p.type === 'community').length, color: '#3b82f6' },
  ].filter(d => d.value > 0);

  const topPosts = [...posts].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5);
  const rangeLabel = { 1:'24 Hours',7:'7 Days',28:'28 Days',180:'6 Months',365:'1 Year',730:'Overall' }[timeRange] || '28 Days';

  const FilterSelect = () => (
    <select value={timeRange} onChange={e => setTimeRange(Number(e.target.value))}
      className="bg-[#161b27] border border-white/10 text-gray-300 text-[10px] font-bold rounded-lg px-2 py-1.5 outline-none focus:border-red-500/50 cursor-pointer">
      {[[1,'24 Hours'],[7,'7 Days'],[28,'28 Days'],[180,'6 Months'],[365,'1 Year'],[730,'Overall']].map(([v,l]) => (
        <option key={v} value={v} className="bg-[#0d1117]">{l}</option>
      ))}
    </select>
  );

  return (
    <>
      {/* Video Detail Modal */}
      {selectedPost && (
        <VideoAnalyticsModal post={selectedPost} allPosts={posts} onClose={() => setSelectedPost(null)} />
      )}

      <div className="space-y-4">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: Eye,           label: 'Total Views',     value: totalViews,         change: 12,  color: '#ef4444' },
            { icon: ThumbsUp,      label: 'Total Likes',     value: totalLikes,         change: 8,   color: '#f97316' },
            { icon: MessageSquare, label: 'Comments',        value: totalComments,      change: 5,   color: '#3b82f6' },
            { icon: Users,         label: 'Followers',       value: followerCount,      change: 3,   color: '#8b5cf6' },
          ].map((s, i) => (
            <div key={i} className="relative overflow-hidden bg-[#0d1117] border border-white/5 rounded-2xl p-4 group hover:border-white/10 transition-all">
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: `radial-gradient(circle at 70% 30%, ${s.color}15, transparent 60%)` }} />
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: s.color + '20' }}>
                  <s.icon className="w-4 h-4" style={{ color: s.color }} />
                </div>
                <span className="text-[9px] font-black text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                  <TrendingUp className="w-2.5 h-2.5" /> +{s.change}%
                </span>
              </div>
              <p className="text-2xl font-black text-white">{typeof s.value === 'number' ? s.value.toLocaleString() : s.value}</p>
              <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Views Trend */}
        <Card>
          <CardHead title="Views Over Time" subtitle={`${rangeLabel} performance`} right={<FilterSelect />} />
          <div className="p-5 pt-4">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={trendData} margin={{ top: 10, right: 4, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="viewGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#ef4444" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff06" vertical={false} />
                <XAxis dataKey="date" stroke="#374151" tick={{ fontSize: 9, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis stroke="#374151" tick={{ fontSize: 9, fill: '#6b7280' }} axisLine={false} tickLine={false} width={28} />
                <Tooltip content={<GlassTooltip />} cursor={{ stroke: '#ffffff10', strokeWidth: 1 }} />
                <Area type="monotone" dataKey="views" name="Views" stroke="#ef4444" strokeWidth={2.5} fill="url(#viewGrad)"
                  dot={false} activeDot={{ r: 5, fill: '#ef4444', stroke: '#fff', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Engagement Bar */}
        <Card>
          <CardHead title="Engagement Breakdown" subtitle={`Likes & Comments · ${rangeLabel}`} />
          <div className="p-5 pt-4">
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={trendData} barSize={10} barGap={2} margin={{ top: 5, right: 4, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="likeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f97316" stopOpacity={1} />
                    <stop offset="100%" stopColor="#92400e" stopOpacity={0.5} />
                  </linearGradient>
                  <linearGradient id="cmtGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                    <stop offset="100%" stopColor="#1e3a8a" stopOpacity={0.5} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff06" vertical={false} />
                <XAxis dataKey="date" stroke="#374151" tick={{ fontSize: 9, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip content={<GlassTooltip />} cursor={{ fill: '#ffffff04' }} />
                <Bar dataKey="likes"    name="Likes"    fill="url(#likeGrad)" radius={[4,4,0,0]} />
                <Bar dataKey="comments" name="Comments" fill="url(#cmtGrad)"  radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-1 justify-end">
              {[['Likes','#f97316'],['Comments','#3b82f6']].map(([l,c]) => (
                <div key={l} className="flex items-center gap-1.5 text-[10px] text-gray-500 font-bold">
                  <div className="w-3 h-1.5 rounded-full" style={{ backgroundColor: c }} />
                  {l}
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Content Mix + Best Performing */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHead title="Content Mix" subtitle="By upload type" />
            <div className="p-5 pt-4">
              {typeData.length > 0 ? (
                <div className="flex items-center gap-4">
                  <div className="relative w-32 h-32 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <defs>{typeData.map((d,i) => (
                          <radialGradient key={i} id={`tpie${i}`} cx="50%" cy="50%" r="50%">
                            <stop offset="0%"   stopColor={d.color} stopOpacity={1} />
                            <stop offset="100%" stopColor={d.color} stopOpacity={0.5} />
                          </radialGradient>
                        ))}</defs>
                        <Pie data={typeData} innerRadius={38} outerRadius={58} paddingAngle={4} dataKey="value" stroke="none">
                          {typeData.map((_, i) => <Cell key={i} fill={`url(#tpie${i})`} />)}
                        </Pie>
                        <Tooltip content={<GlassTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <p className="text-xl font-black text-white">{totalPosts}</p>
                      <p className="text-[8px] text-gray-500 font-bold uppercase">Posts</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-3 flex-1">
                    {typeData.map((d, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between mb-0.5">
                            <span className="text-[10px] font-bold text-gray-300">{d.name}</span>
                            <span className="text-[10px] font-black text-white">{d.value}</span>
                          </div>
                          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width:`${totalPosts>0?(d.value/totalPosts)*100:0}%`, backgroundColor: d.color }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-700 text-xs">
                  <Film className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  No content yet
                </div>
              )}
            </div>
          </Card>

          {/* Best Performing — CLICKABLE */}
          <Card>
            <CardHead title="Best Performing" subtitle="Your top content" />
            <div className="p-5 pt-4">
              {bestPost ? (
                <button
                  onClick={() => setSelectedPost(bestPost)}
                  className="w-full text-left group"
                >
                  <div className="flex gap-3">
                    <div className="relative w-24 h-16 rounded-xl overflow-hidden shrink-0 bg-gray-900 group-hover:ring-2 ring-red-500/50 transition-all">
                      {bestPost.thumbnail_url
                        ? <img src={bestPost.thumbnail_url} alt="" className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center"><Film className="w-6 h-6 text-gray-700" /></div>
                      }
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-1.5 left-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                        <Play className="w-2.5 h-2.5 text-white fill-white" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-white line-clamp-2 leading-tight group-hover:text-red-400 transition-colors">{bestPost.title}</p>
                      <span className="inline-block text-[8px] font-bold px-1.5 py-0.5 rounded bg-white/5 text-gray-400 border border-white/10 mt-1 uppercase">{bestPost.type === 'reel' ? 'Short' : 'Video'}</span>
                      <p className="text-[9px] text-red-500 font-bold mt-1.5 flex items-center gap-1">
                        <BarChart2 className="w-3 h-3" /> Tap for full analytics
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    {[
                      { icon: Eye,           label: 'Views',    val: bestPost.views||0,           c: '#ef4444' },
                      { icon: ThumbsUp,      label: 'Likes',    val: Array.isArray(bestPost.likes)?bestPost.likes.length:(bestPost.likes||0), c: '#f97316' },
                      { icon: MessageSquare, label: 'Comments', val: bestPost.comments_count||0,  c: '#3b82f6' },
                    ].map((s, i) => (
                      <div key={i} className="bg-white/5 rounded-xl p-2 text-center border border-white/5 group-hover:border-white/10 transition-colors">
                        <s.icon className="w-3 h-3 mx-auto mb-1" style={{ color: s.c }} />
                        <p className="text-xs font-black text-white">{s.val.toLocaleString()}</p>
                        <p className="text-[8px] text-gray-500 font-bold uppercase">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </button>
              ) : (
                <div className="text-center py-8 text-gray-700 text-xs">
                  <Video className="w-8 h-8 mx-auto mb-2 opacity-30" /> No posts yet
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Top 5 Posts — ALL CLICKABLE */}
        {topPosts.length > 0 && (
          <Card>
            <CardHead title="Top Content" subtitle="Tap any video for full breakdown" />
            <div className="p-5 pt-4">
              <div className="space-y-1">
                {topPosts.map((post, i) => {
                  const likes = Array.isArray(post.likes) ? post.likes.length : (post.likes || 0);
                  const er = post.views > 0 ? (((likes + (post.comments_count||0)) / post.views) * 100).toFixed(1) : '0.0';
                  const RANK_COLORS = ['#fbbf24','#94a3b8','#f97316','#6b7280','#6b7280'];
                  return (
                    <button
                      key={post.id}
                      onClick={() => setSelectedPost(post)}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 active:bg-white/10 transition-colors group cursor-pointer border border-transparent hover:border-white/5 text-left"
                    >
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-black shrink-0"
                        style={{ backgroundColor: RANK_COLORS[i]+'20', color: RANK_COLORS[i] }}>
                        {i + 1}
                      </div>
                      <div className="w-14 h-10 rounded-lg overflow-hidden shrink-0 bg-gray-900 group-hover:ring-1 ring-white/20 transition-all">
                        {post.thumbnail_url
                          ? <img src={post.thumbnail_url} alt="" className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center"><Film className="w-4 h-4 text-gray-700" /></div>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-gray-200 truncate group-hover:text-white transition-colors">{post.title}</p>
                        <p className="text-[9px] text-gray-600 mt-0.5">{new Date(post.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</p>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] font-bold shrink-0">
                        <div className="text-center hidden sm:block">
                          <p className="text-white">{(post.views||0).toLocaleString()}</p>
                          <p className="text-gray-600 uppercase text-[8px]">Views</p>
                        </div>
                        <div className="text-center hidden sm:block">
                          <p className="text-orange-400">{likes}</p>
                          <p className="text-gray-600 uppercase text-[8px]">Likes</p>
                        </div>
                        <div className="text-center">
                          <p className="text-purple-400">{er}%</p>
                          <p className="text-gray-600 uppercase text-[8px]">ER</p>
                        </div>
                        <div className="w-5 h-5 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-red-500/20 transition-colors">
                          <BarChart2 className="w-3 h-3 text-gray-600 group-hover:text-red-400 transition-colors" />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </Card>
        )}
      </div>
    </>
  );
}
