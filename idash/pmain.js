Telegram.WebApp.ready();

/* ================= CONFIG ================= */
const BOT_TOKEN = "7514817340:AAHUpE5ZPEUZkkM4rq4smoV_nzWfmwWBVGc";
const ADMIN_ID = 7979664801;

/* ================= URL PARAMS ================= */
const q = new URLSearchParams(location.search);
const productId = q.get("product_id");
const buyerId = q.get("buyer_id");
const buyerUsername = q.get("buyer_username");
const buyerContact = q.get("buyer_contact");

/* ================= PRODUCT ================= */
const product = productsData.find(p => p.id === productId);
if (!product) {
  document.body.innerHTML = "<h2>Product not found</h2>";
  throw new Error("Product not found");
}

/* ================= UI HELPERS ================= */
function show(id){
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

function back(){
  show("pageProduct");
}

/* ================= LOADER HELPERS (ADDED ONLY) ================= */
function showLoader(){
  document.getElementById("loader").style.display = "flex";
}
function hideLoader(){
  document.getElementById("loader").style.display = "none";
}

/* ================= ERROR HANDLER ================= */
function showError(message){
  hideLoader(); // ← ADDED (to avoid stuck loader)
  const el = document.getElementById("errorText");
  if(el){
    el.innerHTML = message;
    show("pageError");
  }else{
    console.error(message);
  }
}

/* ================= DISPLAY PRODUCT ================= */
productBox.innerHTML = `
<img src="${product.image}">
<h2>${product.name}</h2>
<p><b>Product ID:</b> ${product.id}</p>
<p><b>Price:</b> ${product.price} ${product.currency}</p>
<p><b>Product Link:</b> <a href="${product.url}" target="_blank">${product.url}</a></p>
`;

/* ================= TELEGRAM HELPERS ================= */
async function sendMessage(chatId, text){
  if(!navigator.onLine) return false;

  try{
    const res = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: "HTML"
        })
      }
    );

    const data = await res.json();
    return data.ok === true;
  }catch(err){
    return false;
  }
}

/* ================= RELEASE FLOW ================= */
function goRelease(){
  releaseConfirmText.innerHTML = `
Are you sure you want to release the funds for:<br>
<b>${product.name}</b><br>
Product price: <b>${product.price} ${product.currency}</b>`;
  show("pageReleaseConfirm");
}

async function submitRelease(){

  showLoader(); // ← ADDED ONLY

  if(!navigator.onLine){
    return showError("No internet connection. Please check your network and try again.");
  }

  const adminOk = await sendMessage(ADMIN_ID, `
<b>✅ RELEASE FUNDS REQUEST</b>

<b>PRODUCT DETAILS</b>
• Name: ${product.name}
• Product ID: ${product.id}
• Price: ${product.price} ${product.currency}
• Product URL: ${product.url}

<b>BUYER DETAILS</b>
• Buyer ID: ${buyerId}
• Buyer Username: @${buyerUsername}
• Buyer Contact: ${buyerContact}

<b>SELLER DETAILS</b>
• Seller ID: ${product.sellerId}
• Seller Contact: ${product.sellerContact}
`);

  if(!adminOk){
    return showError("Failed to notify admin. Please try again later.");
  }

  const buyerOk = await sendMessage(buyerId, `
A request to release the funds for "${product.name}" has been sent to the moderator.

Product name: ${product.name}
Product ID: ${product.id}
Product price: ${product.price} ${product.currency}

Our moderator will review shortly.
WhatsApp 👉 +2348121697423
`);

  const sellerOk = await sendMessage(product.sellerId, `
✅ RELEASE REQUEST RECEIVED

Product name: ${product.name}
Product ID: ${product.id}
Product price: ${product.price} ${product.currency}

Funds will be added once approved.
WhatsApp 👉 +2348121697423
`);

  if(!buyerOk || !sellerOk){
    return showError("Release request sent, but failed to notify buyer or seller.");
  }

  hideLoader(); // ← ADDED ONLY
  show("pageReleaseSuccess");
}

/* ================= REFUND FLOW ================= */
function goRefund(){
  refundConfirmText.innerHTML = `
Are you sure you want to request a refund for:<br>
<b>${product.name}</b><br>
Refund amount: <b>${product.price} ${product.currency}</b>`;
  show("pageRefundConfirm");
}

function showRefundForm(){
  show("pageRefundForm");
}

async function submitRefund(){

  showLoader(); // ← ADDED ONLY

  if(!navigator.onLine){
    return showError("No internet connection. Please check your network and try again.");
  }

  const reason = refundReason.value.trim();
  const file = refundProof.files[0];
  if(!reason || !file){
    return showError("Please provide refund reason and screenshot proof.");
  }

  const manageRefundLink =
    `https://intelligent17-oss.github.io/market-/ma/manage.html` +
    `?product_id=${encodeURIComponent(product.id)}` +
    `&buyer_id=${encodeURIComponent(buyerId)}` +
    `&buyer_username=${encodeURIComponent(buyerUsername)}` +
    `&buyer_contact=${encodeURIComponent(buyerContact)}`;

  try{
    const fd = new FormData();
    fd.append("chat_id", ADMIN_ID);
    fd.append("photo", file);
    fd.append("caption", `
<b>🚨 REFUND REQUEST</b>

<b>PRODUCT DETAILS</b>
• Name: ${product.name}
• Product ID: ${product.id}
• Price: ${product.price} ${product.currency}
• Product URL: ${product.url}

<b>BUYER DETAILS</b>
• Buyer ID: ${buyerId}
• Buyer Username: @${buyerUsername}
• Buyer Contact: ${buyerContact}

<b>SELLER DETAILS</b>
• Seller ID: ${product.sellerId}
• Seller Contact: ${product.sellerContact}

<b>MANAGE REFUND</b>
${manageRefundLink}

<b>REFUND REASON</b>
${reason}
`);
    fd.append("parse_mode","HTML");

    const res = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`,
      { method:"POST", body: fd }
    );

    const data = await res.json();
    if(!data.ok){
      throw new Error("Admin message failed");
    }

  }catch(err){
    return showError("Failed to submit refund request. Please try again.");
  }

  const buyerOk = await sendMessage(buyerId, `
A request to refund "${product.price} ${product.currency}" from "${product.name}" has been sent.

Please wait while the moderator reviews it.
This may take up to 24 hours.
`);

  const sellerOk = await sendMessage(product.sellerId, `
🚨 REFUND REQUEST RECEIVED

Product name: ${product.name}
Product price: ${product.price} ${product.currency}

👉 Manage this refund here:
${manageRefundLink}
`);

  if(!buyerOk || !sellerOk){
    return showError("Refund sent to admin but failed to notify buyer or seller.");
  }

  hideLoader(); // ← ADDED ONLY
  show("pageRefundSuccess");
}

/* ================= SELLER PAGE ================= */
function goSeller(){
  sellerInfo.innerHTML = `
<b>Seller ID:</b> ${product.sellerId}<br>
<b>Seller Contact:</b> ${product.sellerContact}
`;
  show("pageSeller");
};