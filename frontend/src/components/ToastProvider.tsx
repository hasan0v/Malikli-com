"use client";
import React, { createContext, useContext, useState, useRef, ReactNode } from 'react';
import styles from '@/app/admin/products/adminProducts.module.css';

interface Toast { id:number; msg:string; type?:'success'|'error'|'info'; }
interface ToastContextValue { push:(msg:string,type?:Toast['type'])=>void; }
const ToastContext = createContext<ToastContextValue>({ push:()=>{} });

export const useToast = ()=> useContext(ToastContext);

export default function ToastProvider({children}:{children:ReactNode}){
  const [toasts,setToasts]=useState<Toast[]>([]);
  const idRef=useRef(0);
  const push = (msg:string,type?:Toast['type'])=>{
    const id=++idRef.current;
    setToasts(t=>[...t,{id,msg,type}]);
    setTimeout(()=> setToasts(t=> t.filter(x=>x.id!==id)), 4000);
  };
  return (
    <ToastContext.Provider value={{push}}>
      {children}
      <div className={styles.toastContainer}>
        {toasts.map(t=> <div key={t.id} className={`${styles.toast} ${t.type? styles[t.type]:''}`}>{t.msg}</div>)}
      </div>
    </ToastContext.Provider>
  );
}
