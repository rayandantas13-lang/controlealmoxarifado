// ===================== Firebase =====================
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore, collection, addDoc, updateDoc, doc, deleteDoc, onSnapshot } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDDYJmSTyRzf-5GYlTiTLEmi4OZmxR4CQM",
  authDomain: "almoxarifadoestoque2025.firebaseapp.com",
  databaseURL: "https://almoxarifadoestoque2025-default-rtdb.firebaseio.com",
  projectId: "almoxarifadoestoque2025",
  storageBucket: "almoxarifadoestoque2025.firebasestorage.app",
  messagingSenderId: "1018612661371",
  appId: "1:1018612661371:web:ccdcabf6ae4e42330876de",
  measurementId: "G-BJY6JF8078"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

// ===================== Sistema de Estoque =====================
class InventorySystem {
    constructor() {
        this.products = [];
        this.currentEditingId = null;
        this.filteredProducts = [];
        this.productToDelete = null;
        this.requestItems = [];
        this.locationChart = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadFromFirestore();
    }

    // ===================== Mensagens =====================
    mostrarMensagem(msg, tipo = "info") {
        let msgDiv = document.getElementById("mensagem");
        if (!msgDiv) {
            msgDiv = document.createElement("div");
            msgDiv.id = "mensagem";
            msgDiv.style.cssText = "padding:10px;margin:10px 0;border-radius:5px;font-weight:bold;color:#111;transition:opacity 0.5s;";
            document.body.prepend(msgDiv);
        }
        msgDiv.textContent = msg;
        msgDiv.style.backgroundColor = tipo === "erro" ? "#ff4d4d" : tipo === "sucesso" ? "#00ff66" : "#00c8ff";
        msgDiv.style.opacity = 1;
        setTimeout(() => { msgDiv.style.opacity = 0; }, 3000);
    }

    // ===================== Firestore =====================
    async loadFromFirestore() {
        try {
            const colRef = collection(db, "products");
            onSnapshot(colRef, (snapshot) => {
                this.products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                this.applyCurrentFilter();
                this.renderProducts();
                this.updateStats();
                this.populateRequestProductSelect();
            });
        } catch (error) {
            console.error("Erro ao carregar produtos:", error);
            this.mostrarMensagem("Erro ao carregar produtos do servidor", "erro");
        }
    }

    async addProduct(productData) {
        const errors = this.validateProduct(productData);
        if (errors.length) return this.mostrarMensagem(errors.join(" | "), "erro");

        const product = {
            name: productData.name.trim(),
            code: productData.code.trim().toUpperCase(),
            quantity: parseFloat(productData.quantity),
            location: productData.location.trim(),
            description: productData.description?.trim() || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        try {
            await addDoc(collection(db, "products"), product);
            this.mostrarMensagem("Produto adicionado com sucesso!", "sucesso");
            return true;
        } catch (error) {
            console.error(error);
            this.mostrarMensagem("Erro ao adicionar produto no servidor", "erro");
            return false;
        }
    }

    async updateProduct(productData) {
        const errors = this.validateProduct(productData);
        if (errors.length) return this.mostrarMensagem(errors.join(" | "), "erro");

        try {
            const ref = doc(db, "products", this.currentEditingId);
            await updateDoc(ref, {
                name: productData.name.trim(),
                code: productData.code.trim().toUpperCase(),
                quantity: parseFloat(productData.quantity),
                location: productData.location.trim(),
                description: productData.description?.trim() || '',
                updatedAt: new Date().toISOString()
            });
            this.mostrarMensagem("Produto atualizado com sucesso!", "sucesso");
            return true;
        } catch (error) {
            console.error(error);
            this.mostrarMensagem("Erro ao atualizar produto no servidor", "erro");
            return false;
        }
    }

    async deleteProduct(productId) {
        try {
            const ref = doc(db, "products", productId);
            await deleteDoc(ref);
            this.mostrarMensagem("Produto excluído com sucesso!", "sucesso");
            return true;
        } catch (error) {
            console.error(error);
            this.mostrarMensagem("Erro ao excluir produto do servidor", "erro");
            return false;
        }
    }

    // ===================== Validação =====================
    validateProduct(data) {
        const errors = [];
        if (!data.name?.trim()) errors.push("Nome obrigatório");
        if (!data.code?.trim()) errors.push("Código obrigatório");
        if (data.quantity === '' || data.quantity < 0) errors.push("Quantidade inválida");
        if (!data.location?.trim()) errors.push("Local obrigatório");
        const exists = this.products.find(p => p.code.toLowerCase() === data.code.toLowerCase() && p.id !== this.currentEditingId);
        if (exists) errors.push("Código já existe");
        return errors;
    }

    // ===================== Busca =====================
    searchProducts(query) {
        if (!query?.trim()) this.filteredProducts = [...this.products];
        else {
            const term = query.toLowerCase().trim();
            this.filteredProducts = this.products.filter(p =>
                p.name.toLowerCase().includes(term) ||
                p.code.toLowerCase().includes(term) ||
                p.location.toLowerCase().includes(term) ||
                (p.description && p.description.toLowerCase().includes(term))
            );
        }
        this.renderProducts();
    }

    applyCurrentFilter() {
        const input = document.getElementById("searchInput");
        if (input?.value) this.searchProducts(input.value);
        else this.filteredProducts = [...this.products];
    }

    clearSearch() {
        const input = document.getElementById("searchInput");
        input.value = '';
        this.searchProducts('');
    }

    // ===================== Renderização =====================
    renderProducts() {
        const list = document.getElementById("productsList");
        const emptyState = document.getElementById("emptyState");
        if (!this.filteredProducts.length) { list.style.display = "none"; emptyState.style.display = "block"; return; }
        list.style.display = "block"; emptyState.style.display = "none";
        list.innerHTML = this.filteredProducts.map(p => this.createProductHTML(p)).join('');
    }

    createProductHTML(p) {
        const quantityClass = p.quantity >= 50 ? 'quantity-high' : p.quantity >= 10 ? 'quantity-medium' : 'quantity-low';
        const formattedDate = new Date(p.updatedAt).toLocaleDateString("pt-BR");
        return `
        <div class="product-item" data-id="${p.id}">
            <div class="product-header">
                <div class="product-info">
                    <h3>${this.escapeHtml(p.name)}</h3>
                    <div class="product-code">Código: ${this.escapeHtml(p.code)}</div>
                </div>
                <div class="product-actions">
                    <button class="btn-edit" data-action="edit" data-id="${p.id}">Editar</button>
                    <button class="btn-delete" data-action="delete" data-id="${p.id}">Excluir</button>
                </div>
            </div>
            <div class="product-details">
                <div class="product-detail"><div class="product-detail-label">Quantidade</div><div class="product-detail-value"><span class="quantity-badge ${quantityClass}">${p.quantity}</span></div></div>
                <div class="product-detail"><div class="product-detail-label">Local</div><div class="product-detail-value">${this.escapeHtml(p.location)}</div></div>
                ${p.description ? `<div class="product-detail"><div class="product-detail-label">Descrição</div><div class="product-detail-value">${this.escapeHtml(p.description)}</div></div>` : ''}
                <div class="product-detail"><div class="product-detail-label">Última atualização</div><div class="product-detail-value">${formattedDate}</div></div>
            </div>
        </div>`;
    }

    escapeHtml(text) { const div = document.createElement("div"); div.textContent = text; return div.innerHTML; }

    updateStats() {
        document.getElementById("totalItems").textContent = `Total de itens: ${this.products.length} (${this.products.reduce((sum,p)=>sum+p.quantity,0)} unidades)`;
    }

    // ===================== Modais =====================
    openModal(id) { document.getElementById(id).classList.add("active"); document.getElementById("modalOverlay").classList.add("active"); document.body.style.overflow = "hidden"; }
    closeModal(id) { document.getElementById(id).classList.remove("active"); document.getElementById("modalOverlay").classList.remove("active"); document.body.style.overflow = ""; if(id==="productModal") { this.clearForm(); this.currentEditingId=null; } }
    clearForm() { document.getElementById("productForm").reset(); document.getElementById("modalTitle").textContent="Adicionar Produto"; }
    populateForm(p) { document.getElementById("productName").value=p.name; document.getElementById("productCode").value=p.code; document.getElementById("productQuantity").value=p.quantity; document.getElementById("productLocation").value=p.location; document.getElementById("productDescription").value=p.description||''; document.getElementById("modalTitle").textContent="Editar Produto"; }

    getFormData() { return { name:document.getElementById("productName").value, code:document.getElementById("productCode").value, quantity:document.getElementById("productQuantity").value, location:document.getElementById("productLocation").value, description:document.getElementById("productDescription").value }; }

    addNewProduct() { this.currentEditingId=null; this.clearForm(); this.openModal("productModal"); }
    editProduct(id) { const p=this.products.find(p=>p.id===id); if(!p){this.mostrarMensagem("Produto não encontrado","erro"); return;} this.currentEditingId=id; this.populateForm(p); this.openModal("productModal"); }
    confirmDelete(id) { const p=this.products.find(p=>p.id===id); if(!p){this.mostrarMensagem("Produto não encontrado","erro"); return;} document.getElementById("deleteProductName").textContent=p.name; this.productToDelete=id; this.openModal("confirmModal"); }
    async executeDelete() { if(this.productToDelete){ await this.deleteProduct(this.productToDelete); this.productToDelete=null; this.closeModal("confirmModal"); } }

    async saveProduct() { const data=this.getFormData(); const success=this.currentEditingId? await this.updateProduct(data): await this.addProduct(data); if(success) this.closeModal("productModal"); }

    // ===================== Requisição =====================
    populateRequestProductSelect() {
        const select=document.getElementById("requestProductSelect");
        if(!select) return;
        select.innerHTML='<option value="">Selecione um produto</option>';
        this.products.forEach(p=>{ const opt=document.createElement("option"); opt.value=p.id; opt.textContent=`${p.name} (${p.code}) - ${p.quantity} unidades`; select.appendChild(opt); });
    }

    addRequestItem() {
        const productId=document.getElementById("requestProductSelect").value;
        const quantity=parseInt(document.getElementById("requestQuantity").value);
        if(!productId || isNaN(quantity) || quantity<=0){ this.mostrarMensagem("Selecione produto e insira quantidade válida","erro"); return; }
        const product=this.products.find(p=>p.id===productId);
        if(quantity>product.quantity){ this.mostrarMensagem(`Quantidade solicitada (${quantity}) maior que estoque (${product.quantity})`,"erro"); return; }
        const existing=this.requestItems.find(item=>item.productId===productId);
        if(existing) existing.quantity+=quantity; else this.requestItems.push({ productId, name:product.name, code:product.code, quantity });
        this.renderRequestItems();
    }

    renderRequestItems() {
        const list=document.getElementById("requestItemsList");
        if(!list) return;
        list.innerHTML=this.requestItems.map(item=>`<div class="request-item"><div class="request-item-info"><span>${item.name} (${item.code})</span> - Quantidade: ${item.quantity}</div><button class="remove-request-item" data-product-id="${item.productId}">Remover</button></div>`).join('');
    }

    removeRequestItem(productId){ this.requestItems=this.requestItems.filter(item=>item.productId!==productId); this.renderRequestItems(); }

    async confirmRequest(){
        if(this.requestItems.length===0){ this.mostrarMensagem("Lista de requisição vazia","erro"); return; }
        for(const item of this.requestItems){
            const product=this.products.find(p=>p.id===item.productId);
            const ref=doc(db,"products",item.productId);
            await updateDoc(ref,{ quantity: product.quantity - item.quantity, updatedAt: new Date().toISOString() });
        }
        this.requestItems=[];
        this.renderRequestItems();
        this.mostrarMensagem("Requisição confirmada e estoque atualizado!","sucesso");
    }

    // ===================== Dashboard =====================
    updateDashboardStats(){
        document.getElementById("dashboardTotalProducts").textContent=this.products.length;
        document.getElementById("dashboardTotalQuantity").textContent=this.products.reduce((sum,p)=>sum+p.quantity,0);
        document.getElementById("dashboardLowStock").textContent=this.products.filter(p=>p.quantity<10).length;
    }

    renderProductsByLocationChart(){
        const ctx=document.getElementById("productsByLocationChart");
        if(!ctx) return;
        const dataObj=this.products.reduce((acc,p)=>{ acc[p.location]=(acc[p.location]||0)+p.quantity; return acc; },{});
        const labels=Object.keys(dataObj);
        const data=Object.values(dataObj);
        if(this.locationChart) this.locationChart.destroy();
        this.locationChart=new Chart(ctx.getContext("2d"),{ type:"bar", data:{ labels, datasets:[{label:"Quantidade por Localização", data, backgroundColor:"#2563eb", borderColor:"#1d4ed8", borderWidth:1 }] }, options:{ responsive:true, scales:{ y:{ beginAtZero:true } } } });
    }

    // ===================== Eventos =====================
    bindEvents(){
        document.querySelectorAll(".tab-button").forEach(btn=>{
            btn.addEventListener("click", e=>{
                const tabId=e.target.dataset.tab;
                document.querySelectorAll(".tab-button").forEach(b=>b.classList.remove("active"));
                document.querySelectorAll(".tab-content").forEach(c=>c.classList.remove("active"));
                e.target.classList.add("active");
                document.getElementById(`${tabId}TabContent`).classList.add("active");
                if(tabId==="request") this.populateRequestProductSelect();
                else if(tabId==="dashboard"){ this.updateDashboardStats(); this.renderProductsByLocationChart(); }
            });
        });
        document.getElementById("addItemBtn").addEventListener("click",()=>this.addNewProduct());
        document.getElementById("searchInput").addEventListener("input",e=>this.searchProducts(e.target.value));
        document.getElementById("clearSearch").addEventListener("click",()=>this.clearSearch());
        document.getElementById("closeModal").addEventListener("click",()=>this.closeModal("productModal"));
        document.getElementById("cancelBtn").addEventListener("click",()=>this.closeModal("productModal"));
        document.getElementById("productForm").addEventListener("submit",e=>{ e.preventDefault(); this.saveProduct(); });
        document.getElementById("cancelDelete").addEventListener("click",()=>this.closeModal("confirmModal"));
        document.getElementById("confirmDelete").addEventListener("click",()=>this.executeDelete());
        document.getElementById("modalOverlay").addEventListener("click",()=>{
            const active=document.querySelector(".modal.active"); if(active) this.closeModal(active.id);
        });
        document.addEventListener("keydown",e=>{ if(e.key==="Escape"){ const active=document.querySelector(".modal.active"); if(active) this.closeModal(active.id); } });
        document.querySelectorAll(".modal-content").forEach(c=>c.addEventListener("click",e=>e.stopPropagation()));
        document.getElementById("productsList").addEventListener("click",e=>{
            if(e.target.matches('[data-action="edit"]')) this.editProduct(e.target.dataset.id);
            if(e.target.matches('[data-action="delete"]')) this.confirmDelete(e.target.dataset.id);
        });
        document.getElementById("addRequestItemBtn").addEventListener("click",()=>this.addRequestItem());
        document.getElementById("confirmRequestBtn").addEventListener("click",()=>this.confirmRequest());
        document.getElementById("requestItemsList").addEventListener("click",e=>{
            if(e.target.classList.contains("remove-request-item")) this.removeRequestItem(e.target.dataset.productId);
        });
    }
}

// ===================== Inicialização =====================
document.addEventListener("DOMContentLoaded",()=>{ window.inventorySystem=new InventorySystem(); });
