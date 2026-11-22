import {Router} from 'express';
import multer from 'multer';
import {randomUUID} from 'node:crypto';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {join,resolve,extname} from 'node:path';
import PaymentSettings from '../models/PaymentSettings.js';
import PremiumOrder from '../models/PremiumOrder.js';
import PaymentAudit from '../models/PaymentAudit.js';
import User from '../models/User.js';
import {requireAuth,requireAdmin} from '../middleware/auth.js';
const router=Router();
const receiptFolder=resolve(process.env.RECEIPT_DIR||'./server-private-receipts');
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:5*1024*1024},fileFilter:(req,file,cb)=>{cb(null,['image/jpeg','image/png','image/webp','application/pdf'].includes(file.mimetype))}});
const defaults=[{code:'week',label:'7 kun',days:7,price:0},{code:'month',label:'1 oy',days:30,price:0},{code:'quarter',label:'3 oy',days:90,price:0},{code:'year',label:'1 yil',days:365,price:0}];
async function settings(){return await PaymentSettings.findOne({key:'primary'})||{bank:'UZCARD',cardNumber:'',holder:'',plans:defaults}}
function safeSettings(s){return {bank:s.bank,cardNumber:s.cardNumber,holder:s.holder,plans:s.plans}}
async function notifyTelegram(order,user,bytes,mime){const token=process.env.TELEGRAM_BOT_TOKEN,chatId=process.env.TELEGRAM_ADMIN_CHAT_ID;if(!token||!chatId)return false;
const caption=`🎬 BEY MOVI — TO‘LOV CHEKI\nIsm: ${user.name}\nBEY ID: ${user.publicId}\nTarif: ${order.plan.label}\nNarx: ${order.plan.price} so‘m\nSo‘rov: ${order._id}\nHolat: tekshirilmoqda`;
const f=new FormData();f.set('chat_id',chatId);f.set('caption',caption);const isPdf=mime==='application/pdf';f.set(isPdf?'document':'photo',new Blob([bytes],{type:mime}),isPdf?'chek.pdf':'chek'+(mime==='image/png'?'.png':mime==='image/webp'?'.webp':'.jpg'));
try{const r=await fetch(`https://api.telegram.org/bot${token}/${isPdf?'sendDocument':'sendPhoto'}`,{method:'POST',body:f,signal:AbortSignal.timeout(12000)});return r.ok}catch(e){console.error('Telegram xabari yuborilmadi:',e.message);return false}}
router.get('/settings',async(req,res,next)=>{try{res.json({settings:safeSettings(await settings())})}catch(e){next(e)}});
router.get('/my-orders',requireAuth,async(req,res,next)=>{try{res.json({orders:await PremiumOrder.find({user:req.user._id}).select('-receiptPath').sort({createdAt:-1}).limit(25)})}catch(e){next(e)}});
router.post('/orders',requireAuth,upload.single('receipt'),async(req,res,next)=>{try{
const file=req.file;if(!file)return res.status(400).json({error:'JPG, PNG, WEBP yoki PDF chek yuklang (5 MB gacha)'});
const signature=file.buffer;const mime=file.mimetype;
const valid=(mime==='image/jpeg'&&signature[0]===255&&signature[1]===216&&signature[2]===255)||(mime==='image/png'&&signature.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))||(mime==='image/webp'&&signature.toString('ascii',0,4)==='RIFF'&&signature.toString('ascii',8,12)==='WEBP')||(mime==='application/pdf'&&signature.toString('ascii',0,5)==='%PDF-');
if(!valid)return res.status(400).json({error:'Chek fayli formati noto‘g‘ri'});
const cfg=await settings();const plan=cfg.plans.find(p=>p.code===req.body.plan);if(!cfg.cardNumber||!cfg.holder)return res.status(409).json({error:'Admin hali karta ma’lumotlarini kiritmagan'});if(!plan||!Number.isInteger(plan.price)||plan.price<=0)return res.status(400).json({error:'Premium tarifi hozircha sotuvda emas'});
await mkdir(receiptFolder,{recursive:true});const extension={'image/jpeg':'.jpg','image/png':'.png','image/webp':'.webp','application/pdf':'.pdf'}[mime];const name=randomUUID()+extension;await writeFile(join(receiptFolder,name),file.buffer,{flag:'wx',mode:0o600});
const order=await PremiumOrder.create({user:req.user._id,publicId:req.user.publicId,plan:{code:plan.code,label:plan.label,days:plan.days,price:plan.price},bank:cfg.bank,cardLast4:cfg.cardNumber.slice(-4),receiptPath:name,receiptMime:mime,receiptName:file.originalname});
const sent=await notifyTelegram(order,req.user,file.buffer,mime);if(sent)await PremiumOrder.updateOne({_id:order._id},{$set:{telegramSent:true}});
res.status(201).json({orderId:order._id,status:'PENDING',telegramSent:sent,message:'Chek qabul qilindi. Admin bank tushumini tekshiradi.'});
}catch(e){next(e)}});
router.get('/admin/settings',requireAuth,requireAdmin,async(req,res,next)=>{try{res.json({settings:safeSettings(await settings())})}catch(e){next(e)}});
router.put('/admin/settings',requireAuth,requireAdmin,async(req,res,next)=>{try{const {bank,cardNumber,holder,plans}=req.body||{};const digits=String(cardNumber||'').replace(/\s/g,'');if(!['UZCARD','HUMO'].includes(bank)||!/^[0-9]{16}$/.test(digits)||typeof holder!=='string'||holder.trim().length<3||holder.length>100)return res.status(400).json({error:'Karta raqami (16 raqam) va egasini tekshiring'});
if(!Array.isArray(plans)||plans.length!==4||!['week','month','quarter','year'].every(code=>plans.some(p=>p.code===code&&Number.isSafeInteger(p.price)&&p.price>=0)))return res.status(400).json({error:'4 ta tarif uchun butun so‘m narxlarini kiriting'});
const result=await PaymentSettings.findOneAndUpdate({key:'primary'},{$set:{bank,cardNumber:digits,holder:holder.trim(),plans:defaults.map(d=>({...d,price:plans.find(p=>p.code===d.code).price}))}},{upsert:true,new:true,runValidators:true});res.json({settings:safeSettings(result)})}catch(e){next(e)}});
router.get('/admin/orders',requireAuth,requireAdmin,async(req,res,next)=>{try{const orders=await PremiumOrder.find().select('-receiptPath').sort({createdAt:-1}).limit(100).populate('user','name email publicId');res.json({orders})}catch(e){next(e)}});
router.get('/admin/orders/:id/receipt',requireAuth,requireAdmin,async(req,res,next)=>{try{const order=await PremiumOrder.findById(req.params.id).select('+receiptPath');if(!order)return res.sendStatus(404);const bytes=await readFile(join(receiptFolder,order.receiptPath));res.set('Content-Type',order.receiptMime);res.set('Content-Disposition','inline; filename="payment-receipt"');res.set('Cache-Control','no-store');res.send(bytes)}catch(e){next(e)}});
router.post('/admin/orders/:id/review',requireAuth,requireAdmin,async(req,res,next)=>{try{const approved=req.body?.decision==='APPROVED';if(!approved&&req.body?.decision!=='REJECTED')return res.status(400).json({error:'Noto‘g‘ri qaror'});
// Atomic PENDING -> final transition prevents accidental double approval.
const order=await PremiumOrder.findOneAndUpdate({_id:req.params.id,status:'PENDING'},{$set:{status:approved?'APPROVED':'REJECTED',reviewedBy:req.user._id,reviewedAt:new Date(),adminNote:String(req.body.note||'').slice(0,500)}},{new:true});if(!order)return res.status(409).json({error:'So‘rov avval ko‘rib chiqilgan yoki topilmadi'});
if(approved){const user=await User.findById(order.user);if(!user)return res.status(404).json({error:'Foydalanuvchi topilmadi'});const now=new Date();const from=user.premiumUntil>now?user.premiumUntil:now;user.premiumUntil=new Date(from.getTime()+order.plan.days*86400000);await user.save()}
await PaymentAudit.create({action:approved?'APPROVED':'REJECTED',order:order._id,actor:req.user._id});res.json({success:true,status:order.status})}catch(e){next(e)}});
export default router;
