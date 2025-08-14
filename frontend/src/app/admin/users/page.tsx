'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import { RootState } from '@/store/store';
import styles from './adminUsers.module.css';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://malikli1992.com/api/v1';

interface AdminUser {
  id: number; username: string; email: string; first_name: string; last_name: string;
  phone_number: string | null; is_verified: boolean; is_staff: boolean; is_active: boolean;
  date_joined: string; last_login: string | null;
}
interface Paged<T>{ count: number; next: string|null; previous: string|null; results: T[]; summary?: Summary }
interface Summary { total:number; active:number; inactive:number; staff:number; verified:number; unverified:number; filtered_total:number }

export default function AdminUsersPage(){
  const router = useRouter();
  const { isAuthenticated, user, isInitialized } = useSelector((s:RootState)=>s.auth);
  const [data,setData]=useState<Paged<AdminUser>|null>(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const [page,setPage]=useState(1);
  const [search,setSearch]=useState('');
  const [filters,setFilters]=useState<{is_active?:boolean;is_staff?:boolean}>({});
  const [ordering,setOrdering]=useState<string>('-date_joined');
  const [selected,setSelected]=useState<Set<number>>(new Set());
  const [waitlistEmail,setWaitlistEmail]=useState('');
  const pageSize=20;

  // Auth guard
  useEffect(()=>{ if(!isInitialized) return; if(!isAuthenticated){ router.push('/'); return;} if(user && !user.is_staff){ router.push('/'); } },[isInitialized,isAuthenticated,user,router]);

  const buildQuery=()=>{
    const params=new URLSearchParams();
    params.set('page', String(page));
    params.set('page_size', String(pageSize));
  if(search.trim()) params.set('search', search.trim());
    if(filters.is_active!==undefined) params.set('is_active', String(filters.is_active));
    if(filters.is_staff!==undefined) params.set('is_staff', String(filters.is_staff));
  if(ordering) params.set('ordering', ordering);
    return params.toString();
  };

  const load=useCallback(async()=>{
    if(!user?.is_staff) return; setLoading(true); setError(null);
    try{
      const token=localStorage.getItem('access_token');
      const q=buildQuery();
      const resp=await fetch(`${API_BASE_URL}/users/admin-users/?${q}`,{headers:{'Authorization':`Bearer ${token}`}});
      if(!resp.ok) throw new Error('Failed to load users');
      const json=await resp.json();
      setData(json);
    }catch(e:any){ setError(e.message||'Load error'); }
    finally{ setLoading(false); }
  },[user,search,page,filters]);

  useEffect(()=>{ load(); },[load]);

  // Debounced search
  useEffect(()=>{ const id=setTimeout(()=>{ setPage(1); load(); },400); return()=>clearTimeout(id); },[search]);

  const patchUser=async(id:number, body:Partial<AdminUser>)=>{
    const token=localStorage.getItem('access_token');
    const resp=await fetch(`${API_BASE_URL}/users/admin-users/${id}/`,{method:'PATCH',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},body:JSON.stringify(body)});
    if(!resp.ok) throw new Error('Update failed');
    return resp.json();
  };

  const toggleActive=async(u:AdminUser)=>{
    const optimistic = {...u, is_active: !u.is_active};
    setData(d=> d? {...d, results: d.results.map(r=> r.id===u.id? optimistic:r)}:d );
    try{ await patchUser(u.id,{is_active: !u.is_active}); }catch{ load(); }
  };
  const toggleStaff=async(u:AdminUser)=>{
    const optimistic = {...u, is_staff: !u.is_staff};
    setData(d=> d? {...d, results: d.results.map(r=> r.id===u.id? optimistic:r)}:d );
    try{ await patchUser(u.id,{is_staff: !u.is_staff}); }catch{ load(); }
  };
  const resendVerification=async(u:AdminUser)=>{
    try { await bulkAction('resend_verification',[u.id]); } finally { load(); }
  };

  const bulkAction=async(action:string, ids?:number[])=>{
    const targetIds = ids || Array.from(selected);
    if(targetIds.length===0) return;
    const token=localStorage.getItem('access_token');
    await fetch(`${API_BASE_URL}/users/admin-users/bulk/`,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},body:JSON.stringify({action,ids:targetIds})});
    setSelected(new Set());
    load();
  };

  const toggleSelect=(id:number)=>{
    setSelected(prev=>{const n=new Set(prev); if(n.has(id)) n.delete(id); else n.add(id); return n;});
  };
  const allSelected: boolean = !!(data && data.results.length>0 && data.results.every(u=>selected.has(u.id)));
  const toggleSelectAll=()=>{
    if(!data) return;
    if(allSelected){ setSelected(new Set()); } else { setSelected(new Set(data.results.map(u=>u.id))); }
  };

  const doExportCsv=()=>{
    const token=localStorage.getItem('access_token');
    const q=buildQuery();
    fetch(`${API_BASE_URL}/users/admin-users/export/?${q}`,{headers:{'Authorization':`Bearer ${token}`}})
      .then(r=>r.text())
      .then(txt=>{
        const blob=new Blob([txt],{type:'text/csv'});
        const url=URL.createObjectURL(blob);
        const a=document.createElement('a');
        a.href=url; a.download='users_export.csv'; a.click(); URL.revokeObjectURL(url);
      });
  };

  const convertWaitlist=async()=>{
    if(!waitlistEmail.trim()) return;
    const token=localStorage.getItem('access_token');
    await fetch(`${API_BASE_URL}/users/convert-waitlist/`,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},body:JSON.stringify({email:waitlistEmail.trim()})});
    setWaitlistEmail('');
    load();
  };

  const clearFilters=()=>{ setFilters({}); setPage(1); };

  const totalPages = data? Math.ceil(data.count / pageSize): 1;

  return (
    <div className={styles.wrapper}>
      {(!isInitialized || !isAuthenticated || !user?.is_staff) && (
        <div className={styles.error}>{!isInitialized? 'Initializing...' : 'Authenticating...'}</div>
      )}
      {(isInitialized && isAuthenticated && user?.is_staff) && (
        <>
          <div className={styles.headerRow}>
            <h1>User Management</h1>
            <div className={styles.actions}>
              <div className={styles.searchBox}>
                <input placeholder="Search (name, email, username)" value={search} onChange={e=>{setSearch(e.target.value);}} />
              </div>
              <div className={styles.filterChips}>
                <button className={`${styles.chip} ${filters.is_active===true?styles.chipActive:''}`} onClick={()=>setFilters(f=>({...f,is_active: f.is_active===true? undefined:true}))}>Active</button>
                <button className={`${styles.chip} ${filters.is_active===false?styles.chipActive:''}`} onClick={()=>setFilters(f=>({...f,is_active: f.is_active===false? undefined:false}))}>Inactive</button>
                <button className={`${styles.chip} ${filters.is_staff===true?styles.chipActive:''}`} onClick={()=>setFilters(f=>({...f,is_staff: f.is_staff===true? undefined:true}))}>Staff</button>
                {(filters.is_active!==undefined || filters.is_staff!==undefined) && (
                  <button className={styles.chip} onClick={clearFilters}>Clear</button>
                )}
              </div>
              <select value={ordering} onChange={e=>{setOrdering(e.target.value); setPage(1);}} className={styles.inlineInput}>
                <option value='-date_joined'>Newest</option>
                <option value='date_joined'>Oldest</option>
                <option value='-last_login'>Recent Login</option>
                <option value='last_login'>Login Asc</option>
                <option value='username'>Username A-Z</option>
                <option value='-username'>Username Z-A</option>
              </select>
              <button onClick={doExportCsv} className={styles.exportBtn}>Export CSV</button>
              <div style={{display:'flex',gap:6,alignItems:'center'}}>
                <input className={styles.inlineInput} placeholder='Waitlist email' value={waitlistEmail} onChange={e=>setWaitlistEmail(e.target.value)} />
                <button className={styles.btnSm} onClick={convertWaitlist}>Convert</button>
              </div>
            </div>
          </div>
          {data?.summary && (
            <div className={styles.summaryBar}>
              <span>Total: {data.summary.total}</span>
              <span>Active: {data.summary.active}</span>
              <span>Inactive: {data.summary.inactive}</span>
              <span>Staff: {data.summary.staff}</span>
              <span>Verified: {data.summary.verified}</span>
              <span>Unverified: {data.summary.unverified}</span>
              <span>Filtered: {data.summary.filtered_total}</span>
            </div>
          )}
          {error && <div className={styles.error}>{error}</div>}
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th><input type='checkbox' checked={allSelected} onChange={toggleSelectAll} /></th>
                  <th>ID</th><th>User</th><th>Email</th><th>Phone</th><th>Status</th><th>Joined</th><th>Last Login</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr className={styles.loadingRow}><td colSpan={9}>Loading...</td></tr>
                )}
                {!loading && data && data.results.length===0 && (
                  <tr className={styles.loadingRow}><td colSpan={9}>No users found</td></tr>
                )}
                {data && data.results.map(u=>{
                  return (
                    <tr key={u.id}>
                      <td><input type='checkbox' checked={selected.has(u.id)} onChange={()=>toggleSelect(u.id)} /></td>
                      <td>{u.id}</td>
                      <td>{u.username}<br/><small>{u.first_name} {u.last_name}</small></td>
                      <td>{u.email}{u.is_verified && <span className={`${styles.badge} ${styles.badgeVerified}`}>VERIFIED</span>}</td>
                      <td>{u.phone_number || '-'}</td>
                      <td>
                        <span className={`${styles.badge} ${u.is_active?styles.badgeActive:styles.badgeInactive}`}>{u.is_active? 'ACTIVE':'INACTIVE'}</span>
                        {u.is_staff && <span className={`${styles.badge} ${styles.badgeStaff}`}>STAFF</span>}
                      </td>
                      <td>{u.date_joined.slice(0,10)}</td>
                      <td>{u.last_login? u.last_login.slice(0,10): '-'}</td>
                      <td className={styles.actionsCol}>
                        <button className={styles.btnSm} onClick={()=>toggleActive(u)}>{u.is_active? 'Deactivate':'Activate'}</button>
                        <button className={styles.btnSm} onClick={()=>toggleStaff(u)}>{u.is_staff? 'Revoke Staff':'Make Staff'}</button>
                        {!u.is_verified && <button className={styles.btnSm} onClick={()=>resendVerification(u)}>Resend Verify</button>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {selected.size>0 && (
              <div className={styles.bulkBar}>
                <div className={styles.selectAllBox}>Selected: {selected.size}</div>
                <div className={styles.bulkActions}>
                  <button className={styles.btnSm} onClick={()=>bulkAction('activate')}>Activate</button>
                  <button className={`${styles.btnSm} ${styles.btnDanger}`} onClick={()=>bulkAction('deactivate')}>Deactivate</button>
                  <button className={styles.btnSm} onClick={()=>bulkAction('make_staff')}>Make Staff</button>
                  <button className={styles.btnSm} onClick={()=>bulkAction('revoke_staff')}>Revoke Staff</button>
                  <button className={styles.btnSm} onClick={()=>bulkAction('resend_verification')}>Resend Verification</button>
                  <button className={styles.btnSm} onClick={()=>setSelected(new Set())}>Clear</button>
                </div>
              </div>
            )}
            <div className={styles.pagination}>
              <button className={styles.pageBtn} disabled={page<=1 || loading} onClick={()=>setPage(p=>Math.max(1,p-1))}>Prev</button>
              <span style={{alignSelf:'center',fontSize:12}}>Page {page} / {totalPages||1}</span>
              <button className={styles.pageBtn} disabled={page>=totalPages || loading} onClick={()=>setPage(p=>p+1)}>Next</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
