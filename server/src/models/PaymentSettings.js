import mongoose from 'mongoose';
const schema=new mongoose.Schema({key:{type:String,unique:true,default:'primary'},bank:{type:String,enum:['UZCARD','HUMO'],default:'UZCARD'},cardNumber:{type:String,default:''},holder:{type:String,default:''},plans:{type:[{code:String,label:String,days:Number,price:Number}],default:()=>[{code:'week',label:'7 kun',days:7,price:0},{code:'month',label:'1 oy',days:30,price:0},{code:'quarter',label:'3 oy',days:90,price:0},{code:'year',label:'1 yil',days:365,price:0}]}},{timestamps:true});
export default mongoose.model('PaymentSettings',schema);
