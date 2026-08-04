/* ============================================================
   MAJESTY TOURS Sri Lanka — Partner Registration portal
   Standalone script for register.html (no dependency on app.js).
   ============================================================ */
(function(){
'use strict';
const $=(s,c=document)=>c.querySelector(s);
const $$=(s,c=document)=>[...c.querySelectorAll(s)];

/* ------------------------------------------------------------
   Set up: after deploying the Apps Script Web App (see the
   setup checklist provided alongside this file), paste the
   resulting https://script.google.com/macros/s/.../exec URL
   below.
   ------------------------------------------------------------ */
const REG_ENDPOINT='https://script.google.com/macros/s/AKfycbzRdoacmAbPOEf63KJ2OYLzgmhquN0_aHHQhKUlOv4nT7lpdsTtvOYMEIzl05Pk-Eqt/exec';

const ID_PREFIX={driver:'TD',chauffeur:'CG',national:'NG'};
const MAX_RAW_MB={photo:8,pdf:5};
const PHOTO_MAX_DIM=1600,PHOTO_QUALITY=.8;
const DOC_MAX_DIM=2000,DOC_QUALITY=.85;

const form=$('#registerForm');
if(!form)return;

/* ---------- copy-to-clipboard (mirrors assets/app.js wireCopyBtn) ---------- */
function wireCopyBtn(btnId,getTextFn){
  const btn=document.getElementById(btnId);
  if(!btn)return;
  btn.addEventListener('click',()=>{
    const text=getTextFn();
    if(!text)return;
    navigator.clipboard.writeText(text).then(()=>{
      btn.classList.add('copied');
      setTimeout(()=>btn.classList.remove('copied'),2000);
    }).catch(()=>{});
  });
}

/* ---------- field error helpers ---------- */
function setFieldError(wrapper,msg){
  if(!wrapper)return;
  wrapper.classList.add('invalid');
  const err=$('.err',wrapper);
  if(err)err.textContent=msg;
}
function clearFieldError(wrapper){
  if(!wrapper)return;
  wrapper.classList.remove('invalid');
}
// live-clear on interaction for every field wrapper in the form
$$('.field',form).forEach(wrapper=>{
  wrapper.addEventListener('input',()=>clearFieldError(wrapper));
  wrapper.addEventListener('change',()=>clearFieldError(wrapper));
});

/* ---------- own vehicle → conditional reveal ---------- */
const vehicleFieldsWrap=$('#vehicleFieldsWrap');
const vehiclePhotoField=$('#vehiclePhotoField');
const vehicleTypeInput=$('#reg-vehicle-type');
const passengerCapInput=$('#reg-passenger-capacity');
const vehiclePhotoInput=$('#reg-vehicle-photo');

$$('input[name="own_vehicle"]',form).forEach(r=>r.addEventListener('change',()=>{
  const show=form.own_vehicle.value==='yes';
  vehicleFieldsWrap.hidden=!show;
  vehiclePhotoField.hidden=!show;
  [vehicleTypeInput,passengerCapInput,vehiclePhotoInput].forEach(f=>f.setAttribute('aria-required',String(show)));
  if(!show){
    vehicleTypeInput.value='';
    passengerCapInput.value='';
    resetFilePreview(vehiclePhotoInput);
    clearFieldError(vehicleTypeInput.closest('.field'));
    clearFieldError(passengerCapInput.closest('.field'));
    clearFieldError(vehiclePhotoInput.closest('.field'));
  }
}));

/* ---------- file inputs: size/type check + preview ---------- */
function humanSize(bytes){
  if(bytes<1024*1024)return Math.round(bytes/1024)+'KB';
  return (bytes/(1024*1024)).toFixed(1)+'MB';
}
function sanitizeFileName(name){
  return (name||'file').replace(/[^a-zA-Z0-9._-]/g,'_').slice(-80);
}
function resetFilePreview(input){
  input.value='';
  const preview=document.getElementById('preview-'+input.name);
  if(!preview)return;
  preview.hidden=true;
  const img=$('img',preview),chip=$('.file-chip',preview);
  if(img){img.hidden=true;if(img.src){URL.revokeObjectURL(img.src);img.src='';}}
  if(chip){chip.hidden=true;chip.textContent='';}
}
function wireFileField(inputId,{maxMB,acceptPdf}){
  const input=document.getElementById(inputId);
  if(!input)return;
  const preview=document.getElementById('preview-'+input.name);
  const img=preview?$('img',preview):null;
  const chip=preview?$('.file-chip',preview):null;
  const removeBtn=preview?$('.file-remove',preview):null;

  input.addEventListener('change',()=>{
    const wrapper=input.closest('.field');
    clearFieldError(wrapper);
    const file=input.files[0];
    if(!file)return;
    const isPdf=file.type==='application/pdf';
    const isImage=file.type.startsWith('image/');
    if(!isImage&&!(acceptPdf&&isPdf)){
      setFieldError(wrapper,acceptPdf?'Please upload an image or PDF file.':'Please upload an image file.');
      input.value='';
      return;
    }
    const capMB=isPdf?MAX_RAW_MB.pdf:maxMB;
    if(file.size>capMB*1024*1024){
      setFieldError(wrapper,`This file is too large — please choose a file under ${capMB}MB (yours is ${humanSize(file.size)}).`);
      input.value='';
      return;
    }
    if(preview){
      preview.hidden=false;
      if(isPdf){
        if(img){img.hidden=true;if(img.src){URL.revokeObjectURL(img.src);img.src='';}}
        if(chip){chip.hidden=false;chip.textContent=`📄 ${file.name} (${humanSize(file.size)})`;}
      }else{
        if(chip){chip.hidden=true;chip.textContent='';}
        if(img){
          if(img.src)URL.revokeObjectURL(img.src);
          img.src=URL.createObjectURL(file);
          img.hidden=false;
        }
      }
    }
  });
  removeBtn?.addEventListener('click',()=>{
    resetFilePreview(input);
    setFieldError(input.closest('.field'),'This file is required.');
  });
}
wireFileField('reg-profile-photo',{maxMB:MAX_RAW_MB.photo,acceptPdf:false});
wireFileField('reg-license-doc',{maxMB:MAX_RAW_MB.photo,acceptPdf:true});
wireFileField('reg-vehicle-photo',{maxMB:MAX_RAW_MB.photo,acceptPdf:false});

/* ---------- image downscale / base64 encoding ---------- */
function loadImage(file){
  return new Promise((resolve,reject)=>{
    const url=URL.createObjectURL(file);
    const img=new Image();
    img.onload=()=>{URL.revokeObjectURL(url);resolve(img);};
    img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('image_load_failed'));};
    img.src=url;
  });
}
async function downscaleImage(file,maxDim,quality){
  const img=await loadImage(file);
  let width=img.naturalWidth,height=img.naturalHeight;
  const longest=Math.max(width,height);
  if(longest>maxDim){
    const scale=maxDim/longest;
    width=Math.round(width*scale);height=Math.round(height*scale);
  }
  const canvas=document.createElement('canvas');
  canvas.width=width;canvas.height=height;
  canvas.getContext('2d').drawImage(img,0,0,width,height);
  return canvas.toDataURL('image/jpeg',quality).split(',')[1];
}
function readFileAsBase64(file){
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>resolve(String(reader.result).split(',')[1]);
    reader.onerror=()=>reject(new Error('file_read_failed'));
    reader.readAsDataURL(file);
  });
}
async function encodeUploadFile(input,{maxDim,quality}){
  const file=input.files[0];
  if(!file)return null;
  const isImage=file.type.startsWith('image/');
  const data=isImage?await downscaleImage(file,maxDim,quality):await readFileAsBase64(file);
  return{data,mime:isImage?'image/jpeg':(file.type||'application/octet-stream'),name:sanitizeFileName(file.name)};
}

/* ---------- validation ---------- */
const emailRe=/^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const phoneRe=/^[+\d][\d\s-]{6,}$/;

function validateAll(){
  let firstInvalid=null;
  const fail=(fieldOrWrapper,msg,focusTarget)=>{
    const wrapper=fieldOrWrapper.classList?.contains('field')?fieldOrWrapper:fieldOrWrapper.closest('.field');
    setFieldError(wrapper,msg);
    if(!firstInvalid)firstInvalid={wrapper,focusTarget:focusTarget||wrapper.querySelector('input,select,textarea')};
  };

  if(!form.full_name.value.trim())fail(form.full_name,'Please tell us your name.');
  if(!phoneRe.test(form.mobile.value.trim()))fail(form.mobile,'Please enter a valid mobile / WhatsApp number.');
  if(form.email.value.trim()&&!emailRe.test(form.email.value.trim()))fail(form.email,'Please enter a valid email, or leave it blank.');
  if(!form.location.value.trim())fail(form.location,'Please tell us your current location.');
  if(!form.partner_type.value)fail(form.partner_type,'Please select a partner type.');

  const langsChecked=$$('input[name="languages"]:checked',form);
  if(!langsChecked.length)fail($('#languagesField'),'Please select at least one language.',$('input[name="languages"]',form));

  const years=form.years_experience.value;
  if(years===''||Number(years)<0||Number(years)>60)fail(form.years_experience,'Please enter a valid number of years.');

  if(!form.sltda_registered.value)fail($('#sltdaField'),'Please select yes or no.',$('input[name="sltda_registered"]',form));
  if(!form.license_number.value.trim())fail(form.license_number,'Please enter your SLTDA or guide license number.');

  if(!form.own_vehicle.value)fail($('#vehicleYesNoField'),'Please select yes or no.',$('input[name="own_vehicle"]',form));
  const hasVehicle=form.own_vehicle.value==='yes';
  if(hasVehicle){
    if(!form.vehicle_type.value)fail(form.vehicle_type,'Please select your vehicle type.');
    if(!form.passenger_capacity.value||Number(form.passenger_capacity.value)<1)fail(form.passenger_capacity,'Please enter passenger capacity.');
  }

  if(!$('#reg-profile-photo').files[0])fail($('#reg-profile-photo'),'Please upload a profile photo.');
  if(!$('#reg-license-doc').files[0])fail($('#reg-license-doc'),'Please upload your license/SLTDA certificate.');
  if(hasVehicle&&!$('#reg-vehicle-photo').files[0])fail($('#reg-vehicle-photo'),'Please upload a photo of your vehicle.');

  return firstInvalid;
}

/* ---------- submit ---------- */
const submitBtn=form.querySelector('[type="submit"]');
const errBanner=$('#formError');
const successEl=$('#regSuccess');

function showFormError(msg){
  if(!errBanner)return;
  errBanner.textContent=msg;
  errBanner.hidden=false;
}
function fallbackId(){
  return 'REG-'+Date.now().toString(36)+'-'+Math.floor(Math.random()*1e6).toString(36);
}

form.onsubmit=async(e)=>{
  e.preventDefault();
  if(form.company_website.value)return; // honeypot

  const firstInvalid=validateAll();
  if(firstInvalid){
    firstInvalid.focusTarget?.focus();
    return;
  }

  if(errBanner)errBanner.hidden=true;
  submitBtn.disabled=true;
  const originalLabel=submitBtn.innerHTML;
  submitBtn.innerHTML='<span class="btn-spinner"></span>Submitting…';

  try{
    const hasVehicle=form.own_vehicle.value==='yes';
    const[profilePhoto,licenseDoc,vehiclePhoto]=await Promise.all([
      encodeUploadFile($('#reg-profile-photo'),{maxDim:PHOTO_MAX_DIM,quality:PHOTO_QUALITY}),
      encodeUploadFile($('#reg-license-doc'),{maxDim:DOC_MAX_DIM,quality:DOC_QUALITY}),
      hasVehicle?encodeUploadFile($('#reg-vehicle-photo'),{maxDim:PHOTO_MAX_DIM,quality:PHOTO_QUALITY}):Promise.resolve(null)
    ]);

    const payload={
      request_id:(crypto.randomUUID?.())||fallbackId(),
      full_name:form.full_name.value.trim(),
      mobile:form.mobile.value.trim(),
      email:form.email.value.trim(),
      location:form.location.value.trim(),
      partner_type:form.partner_type.value,
      partner_type_label:form.partner_type.selectedOptions[0]?.textContent||'',
      partner_prefix:ID_PREFIX[form.partner_type.value]||'',
      languages:$$('input[name="languages"]:checked',form).map(c=>c.value),
      years_experience:Number(form.years_experience.value),
      sltda_registered:form.sltda_registered.value,
      license_number:form.license_number.value.trim(),
      own_vehicle:form.own_vehicle.value,
      vehicle_type:hasVehicle?form.vehicle_type.value:'',
      passenger_capacity:hasVehicle?Number(form.passenger_capacity.value):'',
      files:{profile_photo:profilePhoto,license_doc:licenseDoc,vehicle_photo:vehiclePhoto}
    };

    const res=await fetch(REG_ENDPOINT,{
      method:'POST',
      headers:{'Content-Type':'text/plain;charset=utf-8'}, // avoids a CORS preflight Apps Script can't answer
      body:JSON.stringify(payload)
    });
    const json=await res.json();
    if(!json.ok)throw new Error(json.error||'unknown_error');

    form.style.display='none';
    $('#partnerIdDisplay').textContent=json.partner_id||'';
    successEl.classList.add('show');
    const h3=$('h3',successEl);
    if(h3){h3.setAttribute('tabindex','-1');h3.focus();}
  }catch(err){
    showFormError('Something went wrong submitting your application — please try again, or reach us on WhatsApp directly.');
    submitBtn.disabled=false;
    submitBtn.innerHTML=originalLabel;
  }
};

wireCopyBtn('copyPartnerId',()=>$('#partnerIdDisplay')?.textContent?.trim());

})();
