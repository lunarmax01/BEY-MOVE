import mongoose from 'mongoose';
const schema=new mongoose.Schema({action:String,order:{type:mongoose.Schema.Types.ObjectId,ref:'PremiumOrder'},actor:{type:mongoose.Schema.Types.ObjectId,ref:'User'},createdAt:{type:Date,default:Date.now}});
export default mongoose.model('PaymentAudit',schema);
