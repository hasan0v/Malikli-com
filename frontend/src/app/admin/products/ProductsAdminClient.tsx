"use client";
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useRouter, useSearchParams } from 'next/navigation';
import { RootState } from '@/store/store';
// @ts-ignore - using react-window without types package
import { FixedSizeList as List } from 'react-window';
import { useToast } from '@/components/ToastProvider';
import styles from './adminProducts.module.css';

export interface ProductTranslation { language_code: string; name: string; description: string; }
export interface ProductVariant { id:number; size?:any; color?:any; available_quantity:number; is_in_stock:boolean; additional_price:string; sku_suffix:string; name_suffix:string; is_low_stock?:boolean; stock_quantity?:number; reserved_quantity?:number; low_stock_threshold?:number; is_active?:boolean; }
export interface ProductItem { id:number; name:string; slug:string; base_price:string; category_name:string|null; created_at:string; translated_name?:string; is_archived:boolean; variants:ProductVariant[]; translations?: ProductTranslation[]; description?:string; translated_description?:string; }
export interface InitialProductsPayload { count:number; next:string|null; previous:string|null; results: ProductItem[]; }

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://malikli1992.com/api/v1';

// Helper to build auth headers on client side
function buildAuthHeaders(extra: Record<string,string> = {}) {
  if (typeof window === 'undefined') return extra; // SSR safe
  const token = localStorage.getItem('access_token');
  if (token) return { ...extra, 'Authorization': `Bearer ${token}` };
  return extra;
}

interface Props { initialData: InitialProductsPayload|null }

export default function ProductsAdminClient({initialData}:Props){
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, user, isInitialized } = useSelector((s:RootState)=>s.auth);
  const [data,setData]=useState<InitialProductsPayload|null>(initialData);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const [page,setPage]=useState(1);
  const [pageSize] = useState(20);
  const [search,setSearch]=useState('');
  const [category,setCategory]=useState('');
  const [tag,setTag]=useState('');
  const [ordering,setOrdering]=useState('-created_at');
  const [lowStockOnly,setLowStockOnly]=useState(false);
  const [lowStock,setLowStock]=useState<any[]>([]);
  const [drawerProduct,setDrawerProduct]=useState<ProductItem|null>(null);
  const [processing,setProcessing]=useState<number|null>(null); // product id for archive/unarchive
  const [exporting,setExporting]=useState(false);
  const [exportingAll,setExportingAll]=useState(false);
  const [showCreate,setShowCreate]=useState(false);
  const [showEdit,setShowEdit]=useState(false);
  const [editProduct,setEditProduct]=useState<ProductItem|null>(null);
  const [saving,setSaving]=useState(false);
  const [form,setForm]=useState({ name:'', base_price:'', category:'', description:'', tags:'' });
  const [newVariants,setNewVariants]=useState<{size?:string;color?:string;additional_price?:string;sku_suffix?:string;}[]>([]);
  const { push:pushToast } = useToast();
  // Variant management state
  const [sizes,setSizes]=useState<any[]>([]);
  const [colors,setColors]=useState<any[]>([]);
  const [variantSizeSel,setVariantSizeSel]=useState<number[]>([]);
  const [variantColorSel,setVariantColorSel]=useState<number[]>([]);
  const [pricingMatrix,setPricingMatrix]=useState<Record<string,string>>({}); // key sizeId-colorId
  const [stockMatrix,setStockMatrix]=useState<Record<string,string>>({}); // stock per combo
  const [lowMatrix,setLowMatrix]=useState<Record<string,string>>({}); // low stock threshold per combo
  const [addingVariants,setAddingVariants]=useState(false);
  const [variantPage,setVariantPage]=useState(1);
  const VARIANTS_PER_PAGE = 24;
  // Advanced creation state
  const LANGUAGES = ['en','ru','ar','tr','zh'];
  const [translations,setTranslations]=useState<Record<string,{name:string; description:string}>>( ()=>Object.fromEntries(LANGUAGES.map(l=>[l,{name:'',description:''}])) as any );
  const [showTranslations,setShowTranslations]=useState(false);
  // Inline size/color creation
  const [newSize,setNewSize]=useState({ name:'', display_order:'' });
  const [creatingSize,setCreatingSize]=useState(false);
  const [newColor,setNewColor]=useState({ name:'', hex_code:'#', display_order:'' });
  const [creatingColor,setCreatingColor]=useState(false);
  // Custom variant creation (manual) during creation flow
  const [customVariants,setCustomVariants]=useState<{size?:number;color?:number;additional_price?:string;stock?:string;low?:string;tempId:string}[]>([]);
  const addCustomVariant=()=> setCustomVariants(v=>[...v,{tempId:Math.random().toString(36).slice(2,10),additional_price:'0'}]);
  const updateCustomVariant=(id:string, field:string, value:string)=> setCustomVariants(v=> v.map(cv=> cv.tempId===id? {...cv,[field]:value}: cv));
  const removeCustomVariant=(id:string)=> setCustomVariants(v=> v.filter(cv=> cv.tempId!==id));
  const [createdProductPreview,setCreatedProductPreview]=useState<ProductItem|null>(null);
  const [uploadingImage,setUploadingImage]=useState(false);
  const [imageFiles,setImageFiles]=useState<File[]>([]);
  const [gallery,setGallery]=useState<any[]>([]); // product-level images
  const [showImageSection,setShowImageSection]=useState(true);
  const [showVariantSection,setShowVariantSection]=useState(true);
  const [uploadProgress,setUploadProgress]=useState<Record<string,number>>({}); // file.name -> percent
  const [dragOver,setDragOver]=useState(false);
  // Alt text status per image id: 'pending' | 'saving' | 'saved' | 'error'
  const [altStatus,setAltStatus]=useState<Record<string,string>>({});
  const [altDraft,setAltDraft]=useState<Record<string,string>>({});
  const altTimers = React.useRef<Record<string,any>>({});
  const ALT_DEBOUNCE_MS = 700;

  // Debounced alt text saving
  const commitImageAlt = async(slug:string, imageId:number, alt:string)=>{
    const key=String(imageId);
    setAltStatus(s=>({...s,[key]:'saving'}));
    try {
      const resp = await fetch(`${API_BASE_URL}/admin/products/${slug}/images/${imageId}/update-alt/`, { method:'POST', headers: buildAuthHeaders({'Content-Type':'application/json'}), body: JSON.stringify({ alt_text: alt }) });
      if(!resp.ok) throw new Error('fail');
      const data = await resp.json();
      setGallery(data.images||[]);
      setAltStatus(s=>({...s,[key]:'saved'}));
      // clear status after delay
      setTimeout(()=> setAltStatus(s=>{ const c={...s}; if(c[key]==='saved') delete c[key]; return c; }), 2500);
    } catch {
      setAltStatus(s=>({...s,[key]:'error'}));
      pushToast('Alt text save failed','error');
      setTimeout(()=> setAltStatus(s=>{ const c={...s}; if(c[key]==='error') delete c[key]; return c; }), 3500);
    }
  };
  const scheduleAltSave = (slug:string, imageId:number, value:string)=>{
    const key=String(imageId);
    setAltDraft(d=>({...d,[key]:value}));
    setAltStatus(s=> s[key]==='saving'? s : ({...s,[key]:'pending'}));
    if(altTimers.current[key]) clearTimeout(altTimers.current[key]);
    altTimers.current[key] = setTimeout(()=> commitImageAlt(slug,imageId,value.trim()), ALT_DEBOUNCE_MS);
  };
  useEffect(()=>()=>{ // cleanup timers on unmount
    Object.values(altTimers.current).forEach(t=> clearTimeout(t));
  },[]);

  const refreshPreview = useCallback(async(slug:string)=>{
    try{
      const detail = await fetch(`${API_BASE_URL}/products/${slug}/`).then(r=> r.ok? r.json(): null);
      if(detail){ setCreatedProductPreview(detail); setGallery(detail.images||[]); }
    }catch{/* ignore */}
  },[]);

  const optimisticAddTemp = (file:File)=>{
    const tempId = `temp-${file.name}-${Date.now()}`;
    setGallery(g=> [...g, { id:tempId, image: URL.createObjectURL(file), is_primary:false, alt_text:'', display_order: g.length }]);
    return tempId;
  };
  const replaceTempWithServer = (tempId:string, images:any[])=>{
    setGallery(images);
  };
  const uploadFileWithProgress = async(slug:string, file:File)=>{
    const tempId = optimisticAddTemp(file);
    return new Promise<void>((resolve)=>{
      const xhr = new XMLHttpRequest();
  xhr.open('POST', `${API_BASE_URL}/admin/products/${slug}/upload-image/`);
      const token = (typeof window!=='undefined')? localStorage.getItem('access_token'): null;
      if(token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.upload.onprogress = (e)=>{ if(e.lengthComputable){ const pct = Math.round((e.loaded/e.total)*100); setUploadProgress(p=>({...p,[file.name]:pct})); }};
      xhr.onreadystatechange = ()=>{
        if(xhr.readyState===4){
          if(xhr.status>=200 && xhr.status<300){ try { const data=JSON.parse(xhr.responseText); replaceTempWithServer(tempId, data.images||[]); } catch{/* ignore */} }
          setUploadProgress(p=>{ const c={...p}; delete c[file.name]; return c; });
          resolve();
        }
      };
      const fd = new FormData(); fd.append('image', file); xhr.send(fd);
    });
  };
  const uploadQueuedImages = useCallback(async(slug:string)=>{
    if(!imageFiles.length) return; setUploadingImage(true);
    for(const file of imageFiles){ await uploadFileWithProgress(slug,file); }
    setImageFiles([]); setUploadingImage(false); refreshPreview(slug);
  },[imageFiles,refreshPreview]);

  const setPrimaryImage = async(slug:string, imageId:number)=>{
  try { const resp = await fetch(`${API_BASE_URL}/admin/products/${slug}/images/${imageId}/set-primary/`, { method:'POST', headers: buildAuthHeaders() }); if(resp.ok){ const data=await resp.json(); setGallery(data.images||[]); refreshPreview(slug);} }
    catch{ pushToast('Set primary failed','error'); }
  };
  const deleteImage = async(slug:string, imageId:number)=>{
    if(!confirm('Delete image?')) return;
  try { const resp = await fetch(`${API_BASE_URL}/admin/products/${slug}/images/${imageId}/`, { method:'DELETE', headers: buildAuthHeaders() }); if(resp.ok){ const data=await resp.json(); setGallery(data.images||[]); refreshPreview(slug);} }
    catch{ pushToast('Delete failed','error'); }
  };
  const variantUploadImage = async(slug:string, variantId:number, file:File)=>{
    setUploadingImage(true);
    const xhr = new XMLHttpRequest();
  xhr.open('POST', `${API_BASE_URL}/admin/products/${slug}/upload-image/`);
    const token = (typeof window!=='undefined')? localStorage.getItem('access_token'): null;
    if(token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.upload.onprogress = (e)=>{ if(e.lengthComputable){ const pct = Math.round((e.loaded/e.total)*100); setUploadProgress(p=>({...p,[`variant-${variantId}`]:pct})); }};
    xhr.onreadystatechange = ()=>{
      if(xhr.readyState===4){
        if(xhr.status>=200 && xhr.status<300){ try { const data=JSON.parse(xhr.responseText); setGallery(data.images||[]); refreshPreview(slug);} catch{/* ignore */} }
        setUploadProgress(p=>{ const c={...p}; delete c[`variant-${variantId}`]; return c; });
        setUploadingImage(false);
      }
    };
    const fd = new FormData(); fd.append('image', file); fd.append('variant_id', String(variantId)); xhr.send(fd);
  };

  // Auth guard
  useEffect(()=>{ if(!isInitialized) return; if(!isAuthenticated){ router.push('/'); return;} if(user && !user.is_staff){ router.push('/'); } },[isInitialized,isAuthenticated,user,router]);

  // Auto-open create drawer if ?create=1 present
  useEffect(()=>{
    if(searchParams?.get('create')==='1' && !showCreate && !showEdit){ openCreate(); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[searchParams]);

  const buildQuery=()=>{
    const params=new URLSearchParams();
    params.set('page', String(page));
    params.set('page_size', String(pageSize));
    if(search.trim()) params.set('search', search.trim());
    if(category.trim()) params.set('category__slug', category.trim());
    if(tag.trim()) params.set('tags', tag.trim());
    if(ordering) params.set('ordering', ordering);
    return params.toString();
  };

  const load=useCallback(async()=>{
    if(!user?.is_staff) return; setLoading(true); setError(null);
    try{
      const q=buildQuery();
      const resp=await fetch(`${API_BASE_URL}/products/?${q}`);
      if(!resp.ok) throw new Error('Failed to load products');
      const json=await resp.json();
      setData(json);
    }catch(e:any){ setError(e.message||'Load error'); }
    finally{ setLoading(false); }
  },[user,search,page,category,tag,ordering]);

  useEffect(()=>{ // skip reloading if initialData covers first query (page1 default ordering no filters)
    if(page===1 && ordering==='-created_at' && !search && !category && !tag && initialData) return;
    load();
  },[load,initialData,page,ordering,search,category,tag]);

  // Debounced search
  useEffect(()=>{ const id=setTimeout(()=>{ setPage(1); },400); return()=>clearTimeout(id); },[search]);

  // Low stock
  const loadLowStock = useCallback(async()=>{
    if(!user?.is_staff) return;
    try{
      const resp = await fetch(`${API_BASE_URL}/products/low-stock-alerts/`, { headers: buildAuthHeaders() });
      if(resp.status===403){ return; }
      if(resp.ok){ const json=await resp.json(); setLowStock(json.low_stock_variants || []); }
    }catch{/* ignore */}
  },[user]);
  useEffect(()=>{ loadLowStock(); },[loadLowStock]);

  const totalPages = data? Math.ceil(data.count / pageSize): 1;
  const displayedProducts = useMemo(()=>{
    if(!data) return [] as ProductItem[];
    if(!lowStockOnly) return data.results;
    return data.results.filter(p=> p.variants.some(v=> v.is_low_stock || !v.is_in_stock));
  },[data,lowStockOnly]);

  const [variantImagePage,setVariantImagePage]=useState(1);
  const VARIANT_IMAGE_GROUP_PAGE = 25; // number of variant groups (with images) per page
  const openDrawer = async(p:ProductItem)=> {
    setDrawerProduct(p);
    // Fetch full detail (including images) to manage images/alt text
    try {
      const detail = await fetch(`${API_BASE_URL}/products/${p.slug}/`).then(r=> r.ok? r.json(): null);
      if(detail){
        setDrawerProduct(d=> d && d.id===p.id? {...d, variants:detail.variants, translations:detail.translations}: d);
        setGallery(detail.images||[]);
        setVariantImagePage(1);
      }
    } catch{/* ignore */}
  };
  const closeDrawer = ()=> setDrawerProduct(null);

  const toggleArchive = async(p:ProductItem)=>{
    if(processing) return; setProcessing(p.id);
    // optimistic update
    const prev = p.is_archived;
    setData(d=> d? ({...d, results: d.results.map(r=> r.id===p.id? {...r, is_archived: !prev}: r) }): d);
    try {
      const url = `${API_BASE_URL}/products/${p.slug}/${p.is_archived? 'unarchive':'archive'}/`;
      const resp = await fetch(url,{method:'POST'});
      if(!resp.ok) throw new Error('Failed');
      // mutate local state
      setDrawerProduct(dp=> dp && dp.id===p.id? {...dp, is_archived: !prev}: dp);
      pushToast(prev? 'Product unarchived':'Product archived','success');
    } catch(e:any){
      // rollback
      setData(d=> d? ({...d, results: d.results.map(r=> r.id===p.id? {...r, is_archived: prev}: r) }): d);
      setDrawerProduct(dp=> dp && dp.id===p.id? {...dp, is_archived: prev}: dp);
      pushToast(e.message||'Action failed','error');
    }
    finally { setProcessing(null); }
  };

  const exportLowStock = async()=>{
    setExporting(true);
    try {
      const resp = await fetch(`${API_BASE_URL}/products/low-stock-export/`, { headers: buildAuthHeaders() });
      if(!resp.ok) throw new Error('Export failed');
      const blob = await resp.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'low_stock_export.csv'; a.click();
      window.URL.revokeObjectURL(url);
      pushToast('Low stock CSV exported','success');
    } catch(e:any){ alert(e.message||'Export error'); }
    finally { setExporting(false); }
  };

  const exportAll = async()=>{
    setExportingAll(true);
    try {
      // apply filters except pagination
      const params = new URLSearchParams();
      if(search.trim()) params.set('search', search.trim());
      if(category.trim()) params.set('category__slug', category.trim());
      if(tag.trim()) params.set('tags', tag.trim());
      if(ordering) params.set('ordering', ordering);
      const resp = await fetch(`${API_BASE_URL}/products/export-csv/?${params.toString()}`, { headers: buildAuthHeaders() });
      if(!resp.ok) throw new Error('Export failed');
      const blob = await resp.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'products_export.csv'; a.click();
      window.URL.revokeObjectURL(url);
      pushToast('Products CSV exported','success');
    } catch(e:any){ pushToast(e.message||'Export error','error'); }
    finally { setExportingAll(false); }
  };

  const openCreate = ()=>{ setForm({name:'', base_price:'', category:'', description:'', tags:''}); setNewVariants([]); setShowCreate(true); };
  const openEdit = (p:ProductItem)=>{ setEditProduct(p); setForm({ name:p.name, base_price:p.base_price, category:p.category_name||'', description:p.description||'', tags:'' }); setShowEdit(true); };
  const closeForms = ()=>{ setShowCreate(false); setShowEdit(false); setEditProduct(null); };

  const addVariantDraft = ()=> setNewVariants(vs=> [...vs,{ sku_suffix:'', additional_price:'0'}]);
  const updateVariantDraft = (idx:number, field:string, value:string)=> setNewVariants(vs=> vs.map((v,i)=> i===idx? {...v,[field]:value}: v));
  const removeVariantDraft = (idx:number)=> setNewVariants(vs=> vs.filter((_,i)=> i!==idx));

  const submitProduct = async(isEdit:boolean)=>{
    if(saving) return; setSaving(true);
    try {
      const payload:any = { name:form.name, base_price:form.base_price, description:form.description };
      if(form.tags) payload.tags = form.tags.split(',').map(t=>t.trim()).filter(Boolean);
  const endpoint = isEdit? `${API_BASE_URL}/admin/products/${editProduct?.slug}/` : `${API_BASE_URL}/admin/products/`;
      const resp = await fetch(endpoint, { method: isEdit? 'PATCH':'POST', headers: buildAuthHeaders({'Content-Type':'application/json'}), body: JSON.stringify(payload)});
      if(!resp.ok) throw new Error('Save failed');
      const saved = await resp.json();
      // update list optimistically (refetch maybe later)
      setData(d=>{
        if(!d) return d;
        if(isEdit){ return {...d, results: d.results.map(r=> r.id===saved.id? {...r, ...saved}: r)}; }
        return {...d, results:[saved, ...d.results]};
      });
  pushToast(isEdit? 'Product updated':'Product created','success');
      // variant creation via matrix (if sizes/colors selected). (Grouped condition to avoid precedence bug.)
      if(!isEdit && (variantSizeSel.length || variantColorSel.length)){
        try {
          const additional_prices:Record<string,number> = {};
          Object.entries(pricingMatrix).forEach(([k,v])=>{ const val=parseFloat(v||'0'); if(!isNaN(val)) additional_prices[k]=val; });
          const stock:Record<string,number>={};
          Object.entries(stockMatrix).forEach(([k,v])=>{ const val=parseInt(v); if(!isNaN(val)) stock[k]=val; });
          const low_stock_thresholds:Record<string,number>={};
          Object.entries(lowMatrix).forEach(([k,v])=>{ const val=parseInt(v); if(!isNaN(val)) low_stock_thresholds[k]=val; });
          const actionResp = await fetch(`${API_BASE_URL}/products/${saved.slug}/create-variants/`, { method:'POST', headers: buildAuthHeaders({'Content-Type':'application/json'}), body: JSON.stringify({ sizes:variantSizeSel, colors:variantColorSel, additional_prices, stock, low_stock_thresholds }) });
          if(actionResp.ok){
            pushToast('Variants created','success');
            // Optionally refresh single product to include variants
            try { const detail = await fetch(`${API_BASE_URL}/products/${saved.slug}/`).then(r=> r.ok? r.json(): null); if(detail){ setData(d=> d? ({...d, results: d.results.map(r=> r.id===detail.id? {...r, variants:detail.variants}: r)}): d); } } catch{/* ignore */}
          }
        }catch(e:any){ pushToast('Variant creation failed','error'); }
      }
      // Add translations (excluding base language already used in name/description) sequentially for stability
      try {
        await Promise.all(LANGUAGES.filter(l=> l!=='en').map(async(lang)=>{
          const t = translations[lang];
            if(t && (t.name || t.description)){
              await fetch(`${API_BASE_URL}/admin/products/${saved.slug}/add-translation/`, { method:'POST', headers: buildAuthHeaders({'Content-Type':'application/json'}), body: JSON.stringify({ language_code: lang, name: t.name||undefined, description: t.description||undefined }) });
            }
        }));
      }catch{/* ignore translation errors silently for now */}
      // Upload any queued images (product-level) after creation (with progress feedback)
      if(!isEdit && imageFiles.length){ await uploadQueuedImages(saved.slug); }
      // Manual custom variants with duplicate guard vs matrix combos
      if(!isEdit && customVariants.length){
        const matrixCombos = new Set<string>();
        if(variantSizeSel.length && variantColorSel.length){
          variantSizeSel.forEach(s=> variantColorSel.forEach(c=> matrixCombos.add(`${s}-${c}`)));
        } else if(variantSizeSel.length){ variantSizeSel.forEach(s=> matrixCombos.add(String(s))); }
        else if(variantColorSel.length){ variantColorSel.forEach(c=> matrixCombos.add(String(c))); }
        for(const cv of customVariants){
          const comboKey = cv.size && cv.color? `${cv.size}-${cv.color}` : String(cv.size||cv.color||'');
            if(matrixCombos.has(comboKey)) continue; // skip duplicate
            try {
              const addPrices:Record<string,number>={};
              if(cv.size && cv.color) addPrices[`${cv.size}-${cv.color}`]= parseFloat(cv.additional_price||'0')||0;
              else if(cv.size) addPrices[String(cv.size)] = parseFloat(cv.additional_price||'0')||0;
              else if(cv.color) addPrices[String(cv.color)] = parseFloat(cv.additional_price||'0')||0;
              const stock:Record<string,number>={};
              const low_stock_thresholds:Record<string,number>={};
              const k = comboKey;
              if(k){
                if(cv.stock) stock[k]=parseInt(cv.stock)||0;
                if(cv.low) low_stock_thresholds[k]=parseInt(cv.low)||0;
              }
              await fetch(`${API_BASE_URL}/products/${saved.slug}/create-variants/`, { method:'POST', headers: buildAuthHeaders({'Content-Type':'application/json'}), body: JSON.stringify({ sizes: cv.size? [cv.size]:[], colors: cv.color? [cv.color]:[], additional_prices: addPrices, stock, low_stock_thresholds }) });
            } catch {/* ignore individual variant errors */}
        }
      }
      await refreshPreview(saved.slug);
      // Keep drawer open to show preview
    } catch(e:any){ pushToast(e.message||'Error','error'); }
    finally { setSaving(false); }
  };

  // Load sizes/colors for variant management
  useEffect(()=>{
    if(!user?.is_staff) return;
    const run = async()=>{
      try {
        const [s,c] = await Promise.all([
          fetch(`${API_BASE_URL}/products/sizes/`).then(r=> r.ok? r.json(): {results:[]}),
          fetch(`${API_BASE_URL}/products/colors/`).then(r=> r.ok? r.json(): {results:[]})
        ]);
        setSizes(s?.results||s||[]);
        setColors(c?.results||c||[]);
      } catch {/* ignore */ }
    };
    run();
  },[user]);

  const toggleVariantActive = async(variantId:number, active:boolean)=>{
    const product = drawerProduct; if(!product) return;
    // optimistic update
    setDrawerProduct(p=> p? ({...p, variants: p.variants.map(v=> v.id===variantId? {...v, is_active:active}: v)}): p);
    try {
  const resp = await fetch(`${API_BASE_URL}/admin/variants/${variantId}/`, { method:'PATCH', headers: buildAuthHeaders({'Content-Type':'application/json'}), body: JSON.stringify({ is_active:active }) });
      if(!resp.ok) throw new Error('Failed');
      pushToast(active? 'Variant activated':'Variant deactivated','success');
    } catch(e:any){
      // rollback
      setDrawerProduct(p=> p? ({...p, variants: p.variants.map(v=> v.id===variantId? {...v, is_active:!active}: v)}): p);
      pushToast(e.message||'Variant toggle failed','error');
    }
  };

  const addVariantsToExisting = async()=>{
    if(!drawerProduct) return; if(addingVariants) return; setAddingVariants(true);
    try {
      const additional_prices:Record<string,number>={};
      Object.entries(pricingMatrix).forEach(([k,v])=>{ const num=parseFloat(v||'0'); if(!isNaN(num)) additional_prices[k]=num; });
  const stock:Record<string,number>={}; Object.entries(stockMatrix).forEach(([k,v])=>{ const num=parseInt(v); if(!isNaN(num)) stock[k]=num; });
  const low_stock_thresholds:Record<string,number>={}; Object.entries(lowMatrix).forEach(([k,v])=>{ const num=parseInt(v); if(!isNaN(num)) low_stock_thresholds[k]=num; });
  const resp = await fetch(`${API_BASE_URL}/products/${drawerProduct.slug}/create-variants/`, { method:'POST', headers: buildAuthHeaders({'Content-Type':'application/json'}), body: JSON.stringify({ sizes:variantSizeSel, colors:variantColorSel, additional_prices, stock, low_stock_thresholds }) });
      if(!resp.ok) throw new Error('Create variants failed');
      const created = await resp.json();
      setDrawerProduct(p=> p? ({...p, variants:[...p.variants, ...created]}): p);
      pushToast('Variants created','success');
      setPricingMatrix({}); setVariantColorSel([]); setVariantSizeSel([]);
    } catch(e:any){ pushToast(e.message||'Variant creation failed','error'); }
    finally { setAddingVariants(false); }
  };

  const variantCombos = useMemo(()=>{
    const combos: { size?:any; color?:any; key:string }[] = [];
    if(variantSizeSel.length && variantColorSel.length){
      variantSizeSel.forEach(sid=> variantColorSel.forEach(cid=> combos.push({ size:sizes.find(s=>s.id===sid), color:colors.find(c=>c.id===cid), key:`${sid}-${cid}` })));
    } else if(variantSizeSel.length){ variantSizeSel.forEach(sid=> combos.push({ size:sizes.find(s=>s.id===sid), key:String(sid) })); }
    else if(variantColorSel.length){ variantColorSel.forEach(cid=> combos.push({ color:colors.find(c=>c.id===cid), key:String(cid) })); }
    return combos;
  },[variantSizeSel, variantColorSel, sizes, colors]);

  const pagedVariants = useMemo(()=>{
    if(!drawerProduct) return [] as ProductVariant[];
    const start = (variantPage-1)*VARIANTS_PER_PAGE;
    return drawerProduct.variants.slice(start, start+VARIANTS_PER_PAGE);
  },[drawerProduct, variantPage]);
  const variantTotalPages = drawerProduct? Math.ceil(drawerProduct.variants.length/VARIANTS_PER_PAGE):1;

  const skeletonRows = Array.from({length:5}).map((_,i)=>(
    <tr key={i} className={styles.skelRow}>
      <td><div className={styles.skelBox} style={{width:'32px'}}/></td>
      <td><div className={styles.skelLine} style={{width:'140px'}}/><div className={styles.skelLine} style={{width:'80px'}}/></td>
      <td><div className={styles.skelLine} style={{width:'70px'}}/></td>
      <td><div className={styles.skelBox} style={{width:'60px'}}/></td>
      <td><div className={styles.skelLine} style={{width:'120px'}}/></td>
      <td><div className={styles.skelLine} style={{width:'90px'}}/></td>
      <td><div className={styles.skelLine} style={{width:'60px'}}/></td>
    </tr>
  ));

  // Virtualization setup
  const useVirtual = displayedProducts.length > 200;
  const Row = ({index, style}:{index:number; style:React.CSSProperties})=> {
    const p = displayedProducts[index];
    if(!p) return null;
    const name = p.translated_name || p.name;
    return (
      <tr style={style} key={p.id} className={p.is_archived? styles.archivedRow: ''}>
        <td>{p.id}</td>
        <td onClick={()=>openDrawer(p)} className={styles.clickableCell}>
          <div className={styles.nameCell}><strong>{name}</strong><br/><small className={styles.slug}>{p.slug}</small>{p.is_archived && <span className={styles.badge}>ARCHIVED</span>}</div>
        </td>
        <td>{p.category_name || '-'}</td>
        <td>{p.base_price}</td>
        <td>
          <div className={styles.variantList}>
            {p.variants.slice(0,5).map(v=> <span key={v.id} className={`${styles.variant} ${(v.is_low_stock||!v.is_in_stock)? styles.variantOut: ''}`}>{v.sku_suffix} {v.available_quantity}</span>)}
            {p.variants.length>5 && <span className={styles.moreBadge}>+{p.variants.length-5}</span>}
          </div>
        </td>
        <td>{p.created_at.slice(0,10)}</td>
        <td>
          <button className={styles.miniBtn} disabled={processing===p.id} onClick={()=>toggleArchive(p)}>{processing===p.id? '...': p.is_archived? 'Unarchive':'Archive'}</button>
          <button className={styles.miniBtn} onClick={()=>openEdit(p)}>Edit</button>
          <button className={styles.miniBtn} onClick={()=>openDrawer(p)}>Details</button>
        </td>
      </tr>
    );
  };

  return (
    <div className={styles.wrapper}>
      {(!isInitialized || !isAuthenticated || !user?.is_staff) && (
        <div className={styles.infoMsg}>{!isInitialized? 'Initializing...' : 'Authenticating...'}</div>
      )}
      {(isInitialized && isAuthenticated && user?.is_staff) && (
        <>
          <div className={styles.headerRow}>
            <h1>Products</h1>
            <div className={styles.actions}>
              <input className={styles.inlineInput} placeholder='Search name / description' value={search} onChange={e=>setSearch(e.target.value)} />
              <input className={styles.inlineInput} placeholder='Category slug' value={category} onChange={e=>{setCategory(e.target.value); setPage(1);}} />
              <input className={styles.inlineInput} placeholder='Tag' value={tag} onChange={e=>{setTag(e.target.value); setPage(1);}} />
              <select value={ordering} onChange={e=>{setOrdering(e.target.value); setPage(1);}} className={styles.inlineInput}>
                <option value='-created_at'>Newest</option>
                <option value='created_at'>Oldest</option>
                <option value='name'>Name A-Z</option>
                <option value='-name'>Name Z-A</option>
                <option value='base_price'>Price Asc</option>
                <option value='-base_price'>Price Desc</option>
              </select>
              <label className={styles.checkboxLabel}><input type='checkbox' checked={lowStockOnly} onChange={e=>setLowStockOnly(e.target.checked)} /> Low stock only</label>
              <button className={styles.secondaryBtn} disabled={exporting} onClick={exportLowStock}>{exporting? 'Exporting...' : 'Low Stock CSV'}</button>
              <button className={styles.secondaryBtn} disabled={exportingAll} onClick={exportAll}>{exportingAll? 'Exporting...' : 'All Products CSV'}</button>
              <button className={styles.primaryBtn} onClick={openCreate} data-test-id='new-product-btn'>New Product</button>
            </div>
          </div>
          {error && <div className={styles.error}>{error}</div>}
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Base Price</th>
                  <th>Variants</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && skeletonRows}
                {!loading && displayedProducts.length===0 && (
                  <tr><td colSpan={7} className={styles.emptyState}>
                    <div>No products match your filters.</div>
                    <div className={styles.emptyHints}>Try clearing search, removing filters, or adjusting ordering.</div>
                  </td></tr>
                )}
                {!loading && !useVirtual && displayedProducts.map((_,i)=> Row({index:i, style:{}}))}
                {!loading && useVirtual && (
                  <tr>
                    <td colSpan={7} style={{padding:0}}>
                      <div style={{height:500}}>
                        <List height={500} itemCount={displayedProducts.length} itemSize={64} width={'100%'}>
                          {({index, style}:{index:number; style:React.CSSProperties})=> Row({index, style})}
                        </List>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {data && (
              <div className={styles.pagination}>
                <button className={styles.pageBtn} disabled={page<=1 || loading} onClick={()=>setPage(p=>Math.max(1,p-1))}>Prev</button>
                <span className={styles.pageInfo}>Page {page} / {totalPages||1}</span>
                <button className={styles.pageBtn} disabled={page>=totalPages || loading} onClick={()=>setPage(p=>p+1)}>Next</button>
              </div>
            )}
          </div>
          {lowStock.length>0 && (
            <div className={styles.lowStockPanel}>
              <h2>Low Stock Variants ({lowStock.length})</h2>
              <div className={styles.lowStockGrid}>
                {lowStock.slice(0,50).map((v:any)=> (
                  <div key={v.variant_id} className={styles.lowStockCard}>
                    <div className={styles.lowSku}>{v.sku}</div>
                    <div className={styles.lowName}>{v.product_name}</div>
                    <div className={styles.lowQty}>Avail: {v.available_quantity}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {drawerProduct && (
            <div className={styles.drawerOverlay} onClick={closeDrawer}>
              <div className={styles.drawer} onClick={e=>e.stopPropagation()}>
                <div className={styles.drawerHeader}>
                  <h2>{drawerProduct.translated_name || drawerProduct.name}</h2>
                  <button className={styles.closeBtn} onClick={closeDrawer}>×</button>
                </div>
                <div className={styles.drawerMeta}>
                  <span>ID: {drawerProduct.id}</span>
                  <span>Slug: {drawerProduct.slug}</span>
                  <span>Status: {drawerProduct.is_archived? 'Archived':'Active'}</span>
                </div>
                <div className={styles.drawerSection}>
                  <h3>Images</h3>
                  {gallery.length===0 && <div style={{fontSize:'.55rem', color:'#607d8b'}}>No images uploaded.</div>}
                  {gallery.length>0 && (
                    <div style={{display:'flex', flexDirection:'column', gap:'.5rem'}}>
                      <div className='reorderRow'>
                        {gallery.filter(g=> !g.variant_id).sort((a:any,b:any)=> (a.display_order||0)-(b.display_order||0)).map((img:any,i:number)=> (
                          <div key={img.id} className={`imageThumb ${img.is_primary? 'imageThumbPrimary':''} reorderThumb`} draggable onDragStart={(e)=>{ e.dataTransfer.setData('text/plain', `product:${i}`); }} onDragOver={(e)=>{ e.preventDefault(); }} onDrop={(e)=>{ e.preventDefault(); const fromToken = e.dataTransfer.getData('text/plain'); if(!fromToken.startsWith('product:')) return; const from = parseInt(fromToken.split(':')[1]); const to = i; setGallery(g=>{ const items = g.filter(x=> !x.variant_id); const others = g.filter(x=> x.variant_id); const arr=[...items]; const item=arr.splice(from,1)[0]; arr.splice(to,0,item); // rebuild with updated display_order then merge back
                            arr.forEach((it,idx)=> it.display_order=idx);
                            return [...arr, ...others]; }); }}>
                            <img src={img.image} />
                            <div className='thumbActions'>
                              {!img.is_primary && <button type='button' className='thumbBtn' onClick={()=> setPrimaryImage(drawerProduct.slug, img.id)}>P</button>}
                              <button type='button' className='thumbBtn danger' onClick={()=> deleteImage(drawerProduct.slug, img.id)}>×</button>
                            </div>
                              <div style={{width:'100%', marginTop:4}}>
                                <input
                                  type='text'
                                  placeholder='Alt text'
                                  value={altDraft[String(img.id)] ?? img.alt_text ?? ''}
                                  onChange={(e)=> scheduleAltSave(drawerProduct.slug, img.id, e.target.value)}
                                  style={{width:'100%', border:'1px solid #ccc', fontSize:'.45rem'}}
                                />
                                <AltStatusIcon status={altStatus[String(img.id)]} />
                              </div>
                          </div>
                        ))}
                      </div>
                      {gallery.filter(g=> !g.variant_id).length>1 && (
                        <button type='button' className={styles.miniBtn} onClick={async()=>{
                          try {
                            const orders = gallery.filter(g=> !g.variant_id).sort((a:any,b:any)=> (a.display_order||0)-(b.display_order||0)).map((g:any,i:number)=> ({id:g.id, display_order:i}));
                            await fetch(`${API_BASE_URL}/admin/products/${drawerProduct.slug}/reorder-images/`, { method:'POST', headers: buildAuthHeaders({'Content-Type':'application/json'}), body: JSON.stringify({orders}) });
                            await openDrawer(drawerProduct); // refresh
                            pushToast('Product images reordered','success');
                          } catch { pushToast('Reorder failed','error'); }
                        }}>Save Product Image Order</button>
                      )}
                      {/* Variant image groups with drag/reorder */}
                      {drawerProduct.variants.filter(v=> gallery.some(g=> g.variant_id===v.id)).slice(0, variantImagePage*VARIANT_IMAGE_GROUP_PAGE).map(v=> {
                        const variantImages = gallery.filter(g=> g.variant_id===v.id).sort((a:any,b:any)=> (a.display_order||0)-(b.display_order||0));
                        if(!variantImages.length) return null;
                        return (
                          <div key={v.id} style={{border:'1px solid #e0e0e0', padding:'.4rem', borderRadius:6}}>
                            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'.25rem'}}>
                              <strong style={{fontSize:'.55rem'}}>Variant {v.sku_suffix}</strong>
                              {variantImages.length>1 && <button type='button' className={styles.miniBtn} onClick={async()=>{
                                try {
                                  const orders = variantImages.map((g:any,i:number)=> ({id:g.id, display_order:i}));
                                  await fetch(`${API_BASE_URL}/admin/products/${drawerProduct.slug}/reorder-images/`, { method:'POST', headers: buildAuthHeaders({'Content-Type':'application/json'}), body: JSON.stringify({orders}) });
                                  await openDrawer(drawerProduct);
                                  pushToast('Variant images reordered','success');
                                } catch { pushToast('Reorder failed','error'); }
                              }}>Save Order</button>}
                            </div>
                            <div className='reorderRow'>
                              {variantImages.map((img:any,i:number)=> (
                                <div key={img.id} className={`imageThumb ${img.is_primary? 'imageThumbPrimary':''} reorderThumb`} draggable onDragStart={(e)=>{ e.dataTransfer.setData('text/plain', `v${v.id}:${i}`); }} onDragOver={(e)=>{ e.preventDefault(); }} onDrop={(e)=>{ e.preventDefault(); const token=e.dataTransfer.getData('text/plain'); if(!token.startsWith(`v${v.id}:`)) return; const from=parseInt(token.split(':')[1]); const to=i; setGallery(g=>{ const group = g.filter(x=> x.variant_id===v.id); const others = g.filter(x=> x.variant_id!==v.id); const arr=[...group]; const item=arr.splice(from,1)[0]; arr.splice(to,0,item); arr.forEach((it,idx)=> it.display_order=idx); return [...others, ...arr]; }); }}>
                                  <img src={img.image} />
                                  <div className='thumbActions'>
                                    {!img.is_primary && <button type='button' className='thumbBtn' onClick={()=> setPrimaryImage(drawerProduct.slug, img.id)}>P</button>}
                                    <button type='button' className='thumbBtn danger' onClick={()=> deleteImage(drawerProduct.slug, img.id)}>×</button>
                                  </div>
                                  <div style={{width:'100%', marginTop:4}}>
                                    <input
                                      type='text'
                                      placeholder='Alt text'
                                      value={altDraft[String(img.id)] ?? img.alt_text ?? ''}
                                      onChange={(e)=> scheduleAltSave(drawerProduct.slug, img.id, e.target.value)}
                                      style={{width:'100%', border:'1px solid #ccc', fontSize:'.45rem'}}
                                    />
                                    <AltStatusIcon status={altStatus[String(img.id)]} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                      {drawerProduct.variants.filter(v=> gallery.some(g=> g.variant_id===v.id)).length > variantImagePage*VARIANT_IMAGE_GROUP_PAGE && (
                        <button type='button' className={styles.miniBtn} onClick={()=> setVariantImagePage(p=> p+1)}>Load More Variant Images</button>
                      )}
                      <ImageAuditPanel images={gallery} altDraft={altDraft} scheduleAltSave={scheduleAltSave} productSlug={drawerProduct.slug} />
                    </div>
                  )}
                </div>
                <div className={styles.drawerSection}>
                  <h3>Translations</h3>
                  <div className={styles.translationGrid}>
                    {(drawerProduct.translations||[]).map(t=> (
                      <div key={t.language_code} className={styles.translationCard}>
                        <div className={styles.translationLang}>{t.language_code}</div>
                        <div className={styles.translationName}>{t.name}</div>
                        {t.description && <div className={styles.translationDesc}>{t.description.slice(0,160)}{t.description.length>160?'…':''}</div>}
                      </div>
                    ))}
                    {(drawerProduct.translations||[]).length===0 && <div className={styles.emptyTranslations}>No translations</div>}
                  </div>
                </div>
                <div className={styles.drawerSection}>
                  <h3>Variants ({drawerProduct.variants.length})</h3>
                  <div className={styles.variantGrid}>
                    {pagedVariants.map(v=> (
                      <div key={v.id} className={styles.variantCard}>
                        <div className={styles.variantSku}>{v.sku_suffix}</div>
                        <div className={styles.variantQty}>Avail: {v.available_quantity}</div>
                        {v.is_low_stock && <div className={styles.lowFlag}>LOW</div>}
                        {!v.is_in_stock && <div className={styles.outFlag}>OUT</div>}
                        <div className={styles.variantMeta}>Stock {v.stock_quantity} • Res {v.reserved_quantity}</div>
                        <div style={{display:'flex', gap:'.3rem', marginTop:'.4rem'}}>
                          <button className={styles.miniBtn} onClick={()=>toggleVariantActive(v.id, !v.is_active)}>{v.is_active? 'Deactivate':'Activate'}</button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {variantTotalPages>1 && (
                    <div className={styles.pagination} style={{marginTop:'.75rem'}}>
                      <button className={styles.pageBtn} disabled={variantPage<=1} onClick={()=>setVariantPage(p=>p-1)}>Prev</button>
                      <span className={styles.pageInfo}>Page {variantPage}/{variantTotalPages}</span>
                      <button className={styles.pageBtn} disabled={variantPage>=variantTotalPages} onClick={()=>setVariantPage(p=>p+1)}>Next</button>
                    </div>
                  )}
                </div>
                <div className={styles.drawerSection}>
                  <h3>Add Variants</h3>
                  <div style={{display:'flex', flexWrap:'wrap', gap:'.5rem', marginBottom:'.6rem'}}>
                    <div style={{minWidth:'140px'}}>
                      <div className={styles.fieldGroup}>
                        <label>Sizes</label>
                        <div style={{display:'flex', flexWrap:'wrap', gap:'.35rem'}}>
                          {sizes.map(s=> <button key={s.id} type='button' className={styles.miniBtn} style={variantSizeSel.includes(s.id)? {background:'var(--tiffany-blue)', color:'#fff'}:{}} onClick={()=> setVariantSizeSel(sel=> sel.includes(s.id)? sel.filter(x=>x!==s.id): [...sel,s.id])}>{s.name}</button>)}
                        </div>
                      </div>
                    </div>
                    <div style={{minWidth:'140px'}}>
                      <div className={styles.fieldGroup}>
                        <label>Colors</label>
                        <div style={{display:'flex', flexWrap:'wrap', gap:'.35rem'}}>
                          {colors.map(c=> <button key={c.id} type='button' className={styles.miniBtn} style={variantColorSel.includes(c.id)? {background:'var(--tiffany-blue)', color:'#fff'}:{}} onClick={()=> setVariantColorSel(sel=> sel.includes(c.id)? sel.filter(x=>x!==c.id): [...sel,c.id])}>{c.name}</button>)}
                        </div>
                      </div>
                    </div>
                  </div>
                  {variantCombos.length>0 && (
                    <div style={{overflowX:'auto'}}>
                      <table className={styles.table} style={{fontSize:'.6rem'}}>
                        <thead>
                          <tr>
                            <th>Combo</th>
                            <th>Additional Price</th>
                          </tr>
                        </thead>
                        <tbody>
                          {variantCombos.map(c=> (
                            <tr key={c.key}>
                              <td>{c.size? c.size.name:''}{c.size && c.color? ' / ':''}{c.color? c.color.name:''}</td>
                              <td><input style={{width:'90px'}} className={styles.textInput} value={pricingMatrix[c.key]||''} onChange={e=> setPricingMatrix(m=> ({...m,[c.key]:e.target.value}))} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <div className={styles.drawerActions} style={{padding:'0', border:'none', marginTop:'.75rem'}}>
                    <button disabled={addingVariants || variantCombos.length===0} className={styles.primaryBtn} onClick={addVariantsToExisting}>{addingVariants? 'Adding...':'Add Variants'}</button>
                  </div>
                </div>
                <div className={styles.drawerActions}>
                  <button className={styles.secondaryBtn} disabled={processing===drawerProduct.id} onClick={()=>toggleArchive(drawerProduct)}>{processing===drawerProduct.id? 'Working...' : drawerProduct.is_archived? 'Unarchive Product':'Archive Product'}</button>
                  <button className={styles.textBtn} onClick={closeDrawer}>Close</button>
                </div>
              </div>
            </div>
          )}
          {(showCreate || showEdit) && (
            <div className={styles.drawerOverlay} onClick={closeForms}>
              <div className={styles.drawer} onClick={e=>e.stopPropagation()}>
                <div className={styles.drawerHeader}>
                  <h2>{showEdit? 'Edit Product':'New Product'}</h2>
                  <button className={styles.closeBtn} onClick={closeForms}>×</button>
                </div>
                <div className={styles.formDrawer}>
                  {createdProductPreview && !showEdit && (
                    <div style={{background:'#f1fbfa', padding:'.6rem .7rem', border:'1px solid #b2ece8', borderRadius:'6px', display:'flex', flexDirection:'column', gap:'.4rem'}}>
                      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                        <strong style={{fontSize:'.6rem'}}>Preview:</strong>
                        {uploadingImage && <span style={{fontSize:'.5rem', color:'#006e6a'}}>Uploading images...</span>}
                      </div>
                      <span style={{fontSize:'.6rem'}}>{createdProductPreview.name} (slug: {createdProductPreview.slug}) — Variants: {createdProductPreview.variants.length}</span>
                      <span style={{fontSize:'.52rem', color:'#006e6a'}}>Stock Total: {createdProductPreview.variants.reduce((a:any,v:any)=>a+(v.stock_quantity||0),0)} | Low Threshold Sum: {createdProductPreview.variants.reduce((a:any,v:any)=>a+(v.low_stock_threshold||0),0)}</span>
                      {gallery.length>0 && (
                        <div className='reorderRow'>
                          {gallery.sort((a:any,b:any)=> (a.display_order||0)-(b.display_order||0)).map((img,i)=> (
                            <div key={img.id} className={`imageThumb ${img.is_primary? 'imageThumbPrimary':''} reorderThumb`} draggable onDragStart={(e)=>{ e.dataTransfer.setData('text/plain', String(i)); }} onDragOver={(e)=>{ e.preventDefault(); }} onDrop={(e)=>{ e.preventDefault(); const from = parseInt(e.dataTransfer.getData('text/plain')); const to = i; setGallery(g=>{ const arr=[...g]; const item=arr.splice(from,1)[0]; arr.splice(to,0,item); return arr.map((it,idx)=> ({...it, display_order:idx})); }); }}>
                              <img src={img.image} />
                              <div className='thumbActions'>
                                {!img.is_primary && !String(img.id).startsWith('temp-') && <button type='button' className='thumbBtn' onClick={()=> setPrimaryImage(createdProductPreview.slug, img.id)}>P</button>}
                                {!String(img.id).startsWith('temp-') && <button type='button' className='thumbBtn danger' onClick={()=> deleteImage(createdProductPreview.slug, img.id)}>×</button>}
                              </div>
                              {!String(img.id).startsWith('temp-') && (
                                <div style={{width:'100%', position:'absolute', left:0, bottom:-2, background:'rgba(255,255,255,.85)', padding:'2px'}}>
                                  <input
                                    type='text'
                                    placeholder='Alt text'
                                    value={altDraft[String(img.id)] ?? img.alt_text ?? ''}
                                    onChange={(e)=> scheduleAltSave(createdProductPreview.slug, img.id, e.target.value)}
                                    style={{width:'100%', border:'1px solid #ccc', fontSize:'.45rem'}}
                                  />
                                  <AltStatusIcon status={altStatus[String(img.id)]} inline small />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      {gallery.length>1 && <button type='button' className={styles.miniBtn} style={{alignSelf:'flex-start', marginTop:'.3rem'}} onClick={async()=>{
                        // send reorder payload
                        try {
                          const orders = gallery.map((g,i)=> ({id:g.id, display_order:i})).filter(o=> !String(o.id).startsWith('temp-'));
                          await fetch(`${API_BASE_URL}/admin/products/${createdProductPreview.slug}/reorder-images/`, { method:'POST', headers: buildAuthHeaders({'Content-Type':'application/json'}), body: JSON.stringify({orders}) });
                          refreshPreview(createdProductPreview.slug);
                          pushToast('Reordered','success');
                        }catch{ pushToast('Reorder failed','error'); }
                      }}>Save Order</button>}
                      {!!createdProductPreview.translations && createdProductPreview.translations.length>0 && (
                        <div style={{display:'flex', flexWrap:'wrap', gap:'.25rem'}}>
                          {createdProductPreview.translations.slice(0,5).map((t:any)=> <span key={t.language_code} style={{fontSize:'.45rem', background:'#e0f2f1', padding:'.15rem .3rem', borderRadius:3}}>{t.language_code}:{t.name?.slice(0,10)||''}</span>)}
                        </div>
                      )}
                      {createdProductPreview.variants?.length>0 && (
                        <div style={{display:'flex', flexWrap:'wrap', gap:'.25rem'}}>
                          {createdProductPreview.variants.slice(0,6).map((v:any)=> <span key={v.id} style={{fontSize:'.45rem', background:'#eceff1', padding:'.15rem .3rem', borderRadius:3}}>{v.size_info?.name||''}{v.color_info? (v.size_info? '-':'')+v.color_info.name:''}</span>)}
                        </div>
                      )}
                    </div>
                  )}
                  <div className={styles.fieldGroup}>
                    <label>Name</label>
                    <input className={styles.textInput} value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} />
                  </div>
                  <div className={styles.inlineRow}>
                    <div className={styles.fieldGroup} style={{flex:1}}>
                      <label>Base Price</label>
                      <input className={styles.numberInput} value={form.base_price} onChange={e=>setForm(f=>({...f,base_price:e.target.value}))} />
                    </div>
                    <div className={styles.fieldGroup} style={{flex:1}}>
                      <label>Tags (comma)</label>
                      <input className={styles.textInput} value={form.tags} onChange={e=>setForm(f=>({...f,tags:e.target.value}))} />
                    </div>
                  </div>
                  <div className={styles.fieldGroup}>
                    <label>Description</label>
                    <textarea className={styles.textarea} value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} />
                  </div>
                  {!showEdit && (
                    <div className={styles.fieldGroup}>
                      <label>Draft Variants (simple)</label>
                      <div style={{display:'flex', flexDirection:'column', gap:'.4rem'}}>
                        {newVariants.map((v,idx)=> (
                          <div key={idx} className={styles.variantChip}>
                            <input placeholder='SKU suffix' value={v.sku_suffix||''} onChange={e=>updateVariantDraft(idx,'sku_suffix',e.target.value)} style={{border:'none', background:'transparent'}} />
                            <input placeholder='Add. price' value={v.additional_price||''} onChange={e=>updateVariantDraft(idx,'additional_price',e.target.value)} style={{border:'none', background:'transparent', width:60}} />
                            <button onClick={()=>removeVariantDraft(idx)}>×</button>
                          </div>
                        ))}
                        <button className={styles.miniBtn} type='button' onClick={addVariantDraft}>Add Variant Draft</button>
                      </div>
                    </div>
                  )}
                  <div className={styles.formActions}>
                    <button className={styles.primaryBtn} disabled={saving || !form.name || !form.base_price} onClick={()=>submitProduct(showEdit)}> {saving? 'Saving...' : (showEdit? 'Save Product':'Create Product')} </button>
                    <button className={styles.textBtn} type='button' onClick={closeForms}>Cancel</button>
                  </div>
                  {/* Advanced creation additions (only on create) */}
                  {!showEdit && (
                    <div className={styles.fieldGroup} style={{marginTop:'1rem'}}>
                      <label style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                        <span>Translations</span>
                        <button type='button' className={styles.miniBtn} onClick={()=>setShowTranslations(s=>!s)}>{showTranslations? 'Hide':'Show'}</button>
                      </label>
                      {showTranslations && (
                        <div style={{display:'flex', flexDirection:'column', gap:'.6rem', background:'#f6fbfb', padding:'.6rem', border:'1px solid #e0e6ea', borderRadius:'6px'}}>
                          {LANGUAGES.filter(l=> l!=='en').map(lang=> (
                            <div key={lang} style={{display:'flex', flexDirection:'column', gap:'.3rem'}}>
                              <strong style={{fontSize:'.55rem', letterSpacing:'.5px'}}>{lang.toUpperCase()}</strong>
                              <input placeholder={`Name (${lang})`} className={styles.textInput} value={translations[lang].name} onChange={e=> setTranslations(t=> ({...t,[lang]:{...t[lang], name:e.target.value}}))} />
                              <textarea placeholder={`Description (${lang})`} className={styles.textarea} value={translations[lang].description} onChange={e=> setTranslations(t=> ({...t,[lang]:{...t[lang], description:e.target.value}}))} />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {!showEdit && (
                    <div style={{marginTop:'1.25rem', display:'flex', flexDirection:'column', gap:'1rem'}}>
                      <div className={styles.fieldGroup}>
                        <label>Sizes (select to include in matrix)</label>
                        <div style={{display:'flex', flexWrap:'wrap', gap:'.35rem'}}>
                          {sizes.map(s=> <button key={s.id} type='button' className={styles.miniBtn} style={variantSizeSel.includes(s.id)? {background:'var(--tiffany-blue)', color:'#fff'}:{}} onClick={()=> setVariantSizeSel(sel=> sel.includes(s.id)? sel.filter(x=>x!==s.id): [...sel,s.id])}>{s.name}</button>)}
                        </div>
                        <div style={{display:'flex', gap:'.35rem', marginTop:'.4rem'}}>
                          <input placeholder='New size name' className={styles.textInput} style={{flex:1}} value={newSize.name} onChange={e=> setNewSize(s=>({...s,name:e.target.value}))} />
                          <input placeholder='Order' className={styles.textInput} style={{width:'70px'}} value={newSize.display_order} onChange={e=> setNewSize(s=>({...s,display_order:e.target.value}))} />
                          <button type='button' className={styles.miniBtn} disabled={creatingSize || !newSize.name} onClick={async()=>{
                            if(creatingSize) return; setCreatingSize(true);
                            try { const resp = await fetch(`${API_BASE_URL}/admin/sizes/`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ name:newSize.name, display_order: newSize.display_order? parseInt(newSize.display_order): undefined })}); if(resp.ok){ const created=await resp.json(); setSizes(s=> [...s, created]); setNewSize({name:'', display_order:''}); pushToast('Size added','success'); } else { pushToast('Create size failed','error'); } } catch{ pushToast('Create size error','error'); } finally { setCreatingSize(false);} 
                          }}>{creatingSize? '...':'Add'}</button>
                        </div>
                      </div>
                      <div className={styles.fieldGroup}>
                        <label>Colors (select to include in matrix)</label>
                        <div style={{display:'flex', flexWrap:'wrap', gap:'.35rem'}}>
                          {colors.map(c=> <button key={c.id} type='button' className={styles.miniBtn} style={variantColorSel.includes(c.id)? {background:'var(--tiffany-blue)', color:'#fff'}:{}} onClick={()=> setVariantColorSel(sel=> sel.includes(c.id)? sel.filter(x=>x!==c.id): [...sel,c.id])}>{c.name}</button>)}
                        </div>
                        <div style={{display:'flex', gap:'.35rem', marginTop:'.4rem'}}>
                          <input placeholder='New color name' className={styles.textInput} style={{flex:1}} value={newColor.name} onChange={e=> setNewColor(c=>({...c,name:e.target.value}))} />
                          <input placeholder='#hex' className={styles.textInput} style={{width:'80px'}} value={newColor.hex_code} onChange={e=> setNewColor(c=>({...c,hex_code:e.target.value}))} />
                          <input placeholder='Order' className={styles.textInput} style={{width:'70px'}} value={newColor.display_order} onChange={e=> setNewColor(c=>({...c,display_order:e.target.value}))} />
                          <button type='button' className={styles.miniBtn} disabled={creatingColor || !newColor.name} onClick={async()=>{
                            if(creatingColor) return; setCreatingColor(true);
                            try { const resp = await fetch(`${API_BASE_URL}/admin/colors/`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ name:newColor.name, hex_code:newColor.hex_code, display_order: newColor.display_order? parseInt(newColor.display_order): undefined })}); if(resp.ok){ const created=await resp.json(); setColors(c=> [...c, created]); setNewColor({name:'', hex_code:'#', display_order:''}); pushToast('Color added','success'); } else { pushToast('Create color failed','error'); } } catch{ pushToast('Create color error','error'); } finally { setCreatingColor(false);} 
                          }}>{creatingColor? '...':'Add'}</button>
                        </div>
                      </div>
                      <div className={styles.fieldGroup}>
                        <div className='collapseHeader' onClick={()=> setShowImageSection(s=>!s)}>
                          <span>Product Images {gallery.length>0 && `(${gallery.length})`}</span>
                          <span>{showImageSection? '▾':'▸'}</span>
                        </div>
                        {showImageSection && (
                          <div className='collapseContent'>
                            <div className={`dragDropZone ${dragOver? 'dragOver':''}`}
                              onDragOver={e=>{ e.preventDefault(); setDragOver(true); }}
                              onDragLeave={()=> setDragOver(false)}
                              onDrop={e=>{ e.preventDefault(); setDragOver(false); const files = Array.from(e.dataTransfer.files||[]); setImageFiles(f=> [...f, ...files]); }}
                            >Drag & Drop images here or click below</div>
                            <input type='file' multiple onChange={e=> setImageFiles(Array.from(e.target.files||[]))} />
                            {imageFiles.length>0 && <div style={{fontSize:'.55rem'}}>{imageFiles.length} image(s) queued for upload {createdProductPreview? '':'(will upload after create)'}.</div>}
                            {Object.keys(uploadProgress).length>0 && (
                              <div style={{display:'flex', flexDirection:'column', gap:'.35rem', marginTop:'.5rem'}}>
                                {Object.entries(uploadProgress).map(([k,v])=> (
                                  <div key={k} style={{display:'flex', flexDirection:'column', gap:'.15rem'}}>
                                    <span style={{fontSize:'.45rem'}}>{k} {v}%</span>
                                    <div className='progressBarWrap'><div className='progressBarInner' style={{width:`${v}%`}} /></div>
                                  </div>
                                ))}
                              </div>
                            )}
                            {createdProductPreview && <div style={{marginTop:'.35rem'}}>
                              <button type='button' disabled={uploadingImage || !imageFiles.length} className={styles.miniBtn} onClick={()=> uploadQueuedImages(createdProductPreview.slug)}>{uploadingImage? 'Uploading...':'Upload Now'}</button>
                            </div>}
                          </div>
                        )}
                      </div>
                      {(variantSizeSel.length || variantColorSel.length) ? (
                        <div className={styles.fieldGroup}>
                          <label>Variant Matrix (Additional Price / Stock / Low Threshold)</label>
                          <div style={{overflowX:'auto'}}>
                            <table className={styles.table} style={{fontSize:'.6rem'}}>
                              <thead>
                                <tr>
                                  <th>Combo</th>
                                  <th>Add. Price</th>
                                  <th>Stock</th>
                                  <th>Low Thr.</th>
                                </tr>
                              </thead>
                              <tbody>
                                {variantCombos.map(c=> (
                                  <tr key={c.key}>
                                    <td>{c.size? c.size.name:''}{c.size && c.color? ' / ':''}{c.color? c.color.name:''}</td>
                                    <td><input style={{width:'80px'}} className={styles.textInput} value={pricingMatrix[c.key]||''} onChange={e=> setPricingMatrix(m=> ({...m,[c.key]:e.target.value}))} /></td>
                                    <td><input style={{width:'70px'}} className={styles.textInput} value={stockMatrix[c.key]||''} onChange={e=> setStockMatrix(m=> ({...m,[c.key]:e.target.value}))} /></td>
                                    <td><input style={{width:'70px'}} className={styles.textInput} value={lowMatrix[c.key]||''} onChange={e=> setLowMatrix(m=> ({...m,[c.key]:e.target.value}))} /></td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ): <div style={{fontSize:'.55rem', color:'#607d8b'}}>Select sizes and/or colors to create variants (optional).</div>}
                      <div className={styles.fieldGroup}>
                        <div className='collapseHeader' onClick={()=> setShowVariantSection(s=>!s)}>
                          <span>Custom Variants & Variant Images</span>
                          <span>{showVariantSection? '▾':'▸'}</span>
                        </div>
                        {showVariantSection && (
                        <>
                        <label style={{display:'none'}}>Custom Variants (manual)</label>
                        <div style={{display:'flex', flexDirection:'column', gap:'.4rem'}}>
                          {customVariants.map(cv=> (
                            <div key={cv.tempId} className={styles.variantChip} style={{flexWrap:'wrap'}}>
                              <select value={cv.size||''} onChange={e=> updateCustomVariant(cv.tempId,'size',e.target.value)} className={styles.selectInput} style={{minWidth:'70px'}}>
                                <option value=''>Size</option>
                                {sizes.map(s=> <option key={s.id} value={s.id}>{s.name}</option>)}
                              </select>
                              <select value={cv.color||''} onChange={e=> updateCustomVariant(cv.tempId,'color',e.target.value)} className={styles.selectInput} style={{minWidth:'70px'}}>
                                <option value=''>Color</option>
                                {colors.map(c=> <option key={c.id} value={c.id}>{c.name}</option>)}
                              </select>
                              <input placeholder='Price' value={cv.additional_price||''} onChange={e=> updateCustomVariant(cv.tempId,'additional_price',e.target.value)} style={{border:'none', background:'transparent', width:60}} />
                              <input placeholder='Stock' value={cv.stock||''} onChange={e=> updateCustomVariant(cv.tempId,'stock',e.target.value)} style={{border:'none', background:'transparent', width:60}} />
                              <input placeholder='Low' value={cv.low||''} onChange={e=> updateCustomVariant(cv.tempId,'low',e.target.value)} style={{border:'none', background:'transparent', width:60}} />
                              <button onClick={()=> removeCustomVariant(cv.tempId)}>×</button>
                            </div>
                          ))}
                          <button type='button' className={styles.miniBtn} onClick={addCustomVariant}>Add Custom Variant</button>
                        </div>
                        <div style={{fontSize:'.5rem', color:'#607d8b', marginTop:'.25rem'}}>Use this when you need only a few variants instead of the full matrix.</div>
                        {createdProductPreview && createdProductPreview.variants?.length>0 && (
                          <div style={{marginTop:'.6rem', display:'flex', flexDirection:'column', gap:'.4rem'}}>
                            <label style={{fontSize:'.55rem'}}>Variant Images (upload per variant)</label>
                            <div style={{maxHeight:160, overflowY:'auto', display:'flex', flexDirection:'column', gap:'.35rem'}}>
                              {createdProductPreview.variants.slice(0,40).map((v:any)=> {
                                const count = gallery.filter(g=> g.variant_id===v.id).length; // if backend returns variant_id
                                return (
                                  <div key={v.id} style={{display:'flex', alignItems:'center', gap:'.4rem'}}>
                                    <span style={{fontSize:'.5rem', width:90, flexShrink:0}}>{v.size_info?.name||''}{v.color_info? (v.size_info? '-':'')+v.color_info.name:''}{count>0 && <span className='variantImgCount'>{count}</span>}</span>
                                    <input type='file' onChange={e=> { const file=e.target.files?.[0]; if(file) variantUploadImage(createdProductPreview.slug, v.id, file); e.target.value=''; }} />
                                    {uploadProgress[`variant-${v.id}`] && <div style={{flex:1}} className='progressBarWrap'><div className='progressBarInner' style={{width:`${uploadProgress[`variant-${v.id}`]}%`}} /></div>}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        </>) }
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Small status icon component for alt text saving feedback
function AltStatusIcon({status, inline=false, small=false}:{status?:string; inline?:boolean; small?:boolean}){
  if(!status) return null;
  const size = small? 8: 10;
  const style:React.CSSProperties = { display:'inline-flex', alignItems:'center', gap:2, marginTop:2 };
  let color='#90a4ae'; let symbol='…'; let title='Pending save';
  if(status==='saving'){ color='#0277bd'; symbol='↻'; title='Saving'; }
  else if(status==='saved'){ color='#2e7d32'; symbol='✓'; title='Saved'; }
  else if(status==='error'){ color='#c62828'; symbol='!'; title='Error'; }
  return <span title={title} style={{fontSize: small?'.45rem':'.5rem', color, ...style}}>{symbol}</span>;
}

interface ImageAuditPanelProps { images:any[]; altDraft:Record<string,string>; scheduleAltSave:(slug:string,id:number,value:string)=>void; productSlug:string; }
function ImageAuditPanel({images, altDraft, productSlug, scheduleAltSave}:ImageAuditPanelProps){
  const incomplete = images.filter(img=> !img.alt_text && !(altDraft[String(img.id)]||'').trim());
  if(images.length===0) return null;
  return (
    <div style={{marginTop:'1rem', border:'1px solid #e0e6ea', borderRadius:6, padding:'.5rem .6rem', background:'#fdfefe'}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <strong style={{fontSize:'.55rem'}}>Accessibility / Alt Text Audit</strong>
        <span style={{fontSize:'.5rem', color: incomplete.length? '#c62828':'#2e7d32'}}>{incomplete.length} missing</span>
      </div>
      {incomplete.length>0 && (
        <div style={{display:'flex', flexDirection:'column', gap:'.35rem', marginTop:'.45rem', maxHeight:160, overflowY:'auto'}}>
          {incomplete.slice(0,60).map(img=> (
            <div key={img.id} style={{display:'flex', gap:'.4rem', alignItems:'center'}}>
              <img src={img.image} style={{width:32,height:32,objectFit:'cover',borderRadius:4,border:'1px solid #cfd8dc'}} />
              <input
                type='text'
                placeholder='Add descriptive alt text'
                value={altDraft[String(img.id)] || ''}
                onChange={e=> scheduleAltSave(productSlug, img.id, e.target.value)}
                style={{flex:1, border:'1px solid #ccc', borderRadius:4, fontSize:'.55rem', padding:'.25rem .35rem'}}
              />
              <AltStatusIcon status={altDraft[String(img.id)]? 'pending': undefined} small />
            </div>
          ))}
          {incomplete.length>60 && <div style={{fontSize:'.5rem', color:'#607d8b'}}>Showing first 60 missing alts… continue inline above.</div>}
        </div>
      )}
      {incomplete.length===0 && <div style={{fontSize:'.5rem', color:'#2e7d32', marginTop:'.3rem'}}>All images have alt text. Great accessibility!</div>}
    </div>
  );
}
