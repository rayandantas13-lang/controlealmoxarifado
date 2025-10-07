// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

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

    // ===================== Firestore =====================
    async loadFromFirestore() {
        try {
            const colRef = collection(db, "products");
            onSnapshot(colRef, (snapshot) => {
                this.products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                this.applyCurrentFilter();
                this.renderProducts();
                this.updateStats();
            });
        } catch (error) {
            console.error("Erro ao carregar produtos do Firestore:", error);
        }
    }

    async addProduct(productData) {
        const errors = this.validateProduct(productData);
        if (errors.length > 0) { alert(errors.join("\n")); return false; }

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
            return true;
        } catch (error) {
            console.error("Erro ao adicionar produto:", error);
            alert("Erro ao salvar no servidor.");
            return false;
        }
    }

    async updateProduct(productData) {
        const errors = this.validateProduct(productData);
        if (errors.length > 0) { alert(errors.join("\n")); return false; }

        try {
            const ref = doc(db, "products", this.currentEditingId);
            await updateDoc(ref, {
                ...productData,
                code: productData.code.trim().toUpperCase(),
                quantity: parseFloat(productData.quantity),
                updatedAt: new Date().toISOString()
            });
            return true;
        } catch (error) {
            console.error("Erro ao atualizar produto:", error);
            alert("Erro ao atualizar no servidor.");
            return false;
        }
    }

    async deleteProduct(productId) {
        try {
            const ref = doc(db, "products", productId);
            await deleteDoc(ref);
            return true;
        } catch (error) {
            console.error("Erro ao excluir produto:", error);
            alert("Erro ao excluir do servidor.");
            return false;
        }
    }

    // ===================== Validação =====================
    validateProduct(productData) {
        const errors = [];
        if (!productData.name?.trim()) errors.push("Nome do item é obrigatório");
        if (!productData.code?.trim()) errors.push("Código/ID é obrigatório");
        if (productData.quantity === '' || productData.quantity < 0) errors.push("Quantidade deve ser maior ou igual a zero");
        if (!productData.location?.trim()) errors.push("Local é obrigatório");
        const existing = this.products.find(p => p.code.toLowerCase() === productData.code.toLowerCase() && p.id !== this.currentEditingId);
        if (existing) errors.push("Já existe um produto com este código");
        return errors;
    }

    // ===================== Filtros e busca =====================
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
        const searchInput = document.getElementById("searchInput");
        if (searchInput?.value?.trim()) this.searchProducts(searchInput.value);
        else this.filteredProducts = [...this.products];
    }

    clearSearch() {
        const searchInput = document.getElementById("searchInput");
        searchInput.value = '';
        this.searchProducts('');
    }

    // ===================== Renderização =====================
    renderProducts() {
        const productsList = document.getElementById("productsList");
        const emptyState = document.getElementById("emptyState");
        if (this.filteredProducts.length === 0) {
            productsList.style.display = "none";
            emptyState.style.display = "block";
            return;
        }
        productsList.style.display = "block";
        emptyState.style.display = "none";
        productsList.innerHTML = this.filteredProducts.map(p => this.createProductHTML(p)).join('');
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
                <div class="product-detail">
                    <div class="product-detail-label">Quantidade</div>
                    <div class="product-detail-value"><span class="quantity-badge ${quantityClass}">${p.quantity}</span></div>
                </div>
                <div class="product-detail">
                    <div class="product-detail-label">Local</div>
                    <div class="product-detail-value">${this.escapeHtml(p.location)}</div>
                </div>
                ${p.description ? `<div class="product-detail"><div class="product-detail-label">Descrição</div><div class="product-detail-value">${this.escapeHtml(p.description)}</div></div>` : ''}
                <div class="product-detail">
                    <div class="product-detail-label">Última atualização</div>
                    <div class="product-detail-value">${formattedDate}</div>
                </div>
            </div>
        </div>`;
    }

    escapeHtml(text) {
        const div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
    }

    updateStats() {
        const totalItems = document.getElementById("totalItems");
        const totalQuantity = this.products.reduce((sum, p) => sum + p.quantity, 0);
        totalItems.textContent = `Total de itens: ${this.products.length} (${totalQuantity} unidades)`;
    }

    // ===================== Modais e formulários =====================
    openModal(id) {
        document.getElementById(id).classList.add("active");
        document.getElementById("modalOverlay").classList.add("active");
        document.body.style.overflow = "hidden";
        if (id === "productModal") document.getElementById("productName").focus();
    }

    closeModal(id) {
        document.getElementById(id).classList.remove("active");
        document.getElementById("modalOverlay").classList.remove("active");
        document.body.style.overflow = "";
        if (id === "productModal") {
            this.clearForm();
            this.currentEditingId = null;
        }
    }

    clearForm() { document.getElementById("productForm").reset(); document.getElementById("modalTitle").textContent = "Adicionar Produto"; }
    populateForm(p) {
        document.getElementById("productName").value = p.name;
        document.getElementById("productCode").value = p.code;
        document.getElementById("productQuantity").value = p.quantity;
        document.getElementById("productLocation").value = p.location;
        document.getElementById("productDescription").value = p.description || '';
        document.getElementById("modalTitle").textContent = "Editar Produto";
    }

    getFormData() {
        return {
            name: document.getElementById("productName").value,
            code: document.getElementById("productCode").value,
            quantity: document.getElementById("productQuantity").value,
            location: document.getElementById("productLocation").value,
            description: document.getElementById("productDescription").value
        };
    }

    addNewProduct() { this.currentEditingId = null; this.clearForm(); this.openModal("productModal"); }
    editProduct(id) { const p = this.products.find(p=>p.id===id); if(!p) return alert("Produto não encontrado"); this.currentEditingId = id; this.populateForm(p); this.openModal("productModal"); }
    confirmDelete(id) { const p=this.products.find(p=>p.id===id); if(!p)return alert("Produto não encontrado"); document.getElementById("deleteProductName").textContent=p.name; this.productToDelete=id; this.openModal("confirmModal"); }
    async executeDelete() { if(this.productToDelete){ await this.deleteProduct(this.productToDelete); this.productToDelete=null; this.closeModal("confirmModal"); } }

    async saveProduct() {
        const data = this.getFormData();
        let success = false;
        if (this.currentEditingId) success = await this.updateProduct(data);
        else success = await this.addProduct(data);
        if (success) this.closeModal("productModal");
    }

    // ===================== Requisição =====================
    populateRequestProductSelect() {
        const select = document.getElementById("requestProductSelect");
        select.innerHTML = '<option value="">Selecione um produto</option>';
        this.products.forEach(p => {
            const option = document.createElement("option");
            option.value = p.id;
            option.textContent = `${p.name} (${p.code}) - ${p.quantity} unidades`;
            select.appendChild(option);
        });
    }

    addRequestItem() {
        const productId = document.getElementById("requestProductSelect").value;
        const quantity = parseInt(document.getElementById("requestQuantity").value);
        if (!productId || !quantity || quantity <= 0) {
            alert("Selecione um produto e insira uma quantidade válida.");
            return;
        }

        const product = this.products.find(p => p.id === productId);
        if (quantity > product.quantity) {
            alert(`Quantidade solicitada (${quantity}) maior que o estoque (${product.quantity}).`);
            return;
        }

        const existingItem = this.requestItems.find(item => item.productId === productId);
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            this.requestItems.push({ productId, name: product.name, code: product.code, quantity });
        }

        this.renderRequestItems();
    }

    renderRequestItems() {
        const list = document.getElementById("requestItemsList");
        list.innerHTML = this.requestItems.map(item => `
            <div class="request-item">
                <div class="request-item-info">
                    <span>${item.name} (${item.code})</span> - Quantidade: ${item.quantity}
                </div>
                <button class="remove-request-item" data-product-id="${item.productId}">Remover</button>
            </div>
        `).join('');
    }

    removeRequestItem(productId) {
        this.requestItems = this.requestItems.filter(item => item.productId !== productId);
        this.renderRequestItems();
    }

    async confirmRequest() {
        if (this.requestItems.length === 0) {
            alert("A lista de requisição está vazia.");
            return;
        }

        for (const item of this.requestItems) {
            const product = this.products.find(p => p.id === item.productId);
            const newQuantity = product.quantity - item.quantity;
            const ref = doc(db, "products", item.productId);
            await updateDoc(ref, { quantity: newQuantity, updatedAt: new Date().toISOString() });
        }

        alert("Requisição confirmada e estoque atualizado!");
        this.requestItems = [];
        this.renderRequestItems();
    }

    // ===================== Dashboard =====================
    updateDashboardStats() {
        document.getElementById("dashboardTotalProducts").textContent = this.products.length;
        const totalQuantity = this.products.reduce((sum, p) => sum + p.quantity, 0);
        document.getElementById("dashboardTotalQuantity").textContent = totalQuantity;
        const lowStockProducts = this.products.filter(p => p.quantity < 10).length;
        document.getElementById("dashboardLowStock").textContent = lowStockProducts;
    }

    renderProductsByLocationChart() {
        const ctx = document.getElementById("productsByLocationChart").getContext("2d");
        const locationCounts = this.products.reduce((acc, p) => {
            acc[p.location] = (acc[p.location] || 0) + p.quantity;
            return acc;
        }, {});

        const labels = Object.keys(locationCounts);
        const data = Object.values(locationCounts);

        if (this.locationChart) {
            this.locationChart.destroy();
        }

        this.locationChart = new Chart(ctx, {
            type: "bar",
            data: {
                labels: labels,
                datasets: [{
                    label: "Quantidade por Localização",
                    data: data,
                    backgroundColor: "#2563eb",
                    borderColor: "#1d4ed8",
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    // ===================== Eventos =====================
    bindEvents() {
        // Tab switching logic
        document.querySelectorAll(".tab-button").forEach(button => {
            button.addEventListener("click", (e) => {
                const tabId = e.target.dataset.tab;
                document.querySelectorAll(".tab-button").forEach(btn => btn.classList.remove("active"));
                document.querySelectorAll(".tab-content").forEach(content => content.classList.remove("active"));
                e.target.classList.add("active");
                document.getElementById(`${tabId}TabContent`).classList.add("active");

                if (tabId === "request") {
                    this.populateRequestProductSelect();
                } else if (tabId === "dashboard") {
                    this.updateDashboardStats();
                    this.renderProductsByLocationChart();
                }
            });
        });

        document.getElementById("addItemBtn").addEventListener("click", () => this.addNewProduct());
        document.getElementById("searchInput").addEventListener("input", e => this.searchProducts(e.target.value));
        document.getElementById("clearSearch").addEventListener("click", () => this.clearSearch());
        document.getElementById("closeModal").addEventListener("click", () => this.closeModal("productModal"));
        document.getElementById("cancelBtn").addEventListener("click", () => this.closeModal("productModal"));
        document.getElementById("productForm").addEventListener("submit", e => { e.preventDefault(); this.saveProduct(); });
        document.getElementById("cancelDelete").addEventListener("click", () => this.closeModal("confirmModal"));
        document.getElementById("confirmDelete").addEventListener("click", () => this.executeDelete());
        document.getElementById("modalOverlay").addEventListener("click", () => {
            const active=document.querySelector(".modal.active"); if(active) this.closeModal(active.id);
        });
        document.addEventListener("keydown", e=>{ if(e.key==="Escape"){ const active=document.querySelector(".modal.active"); if(active) this.closeModal(active.id); }});
        document.querySelectorAll(".modal-content").forEach(c=>c.addEventListener("click", e=>e.stopPropagation()));

        // Eventos dinâmicos para os botões "Editar" e "Excluir"
        document.getElementById("productsList").addEventListener("click", e => {
            if (e.target.matches('[data-action="edit"]')) {
                this.editProduct(e.target.dataset.id);
            }
            if (e.target.matches('[data-action="delete"]')) {
                this.confirmDelete(e.target.dataset.id);
            }
        });

        // Eventos da aba de requisição
        document.getElementById("addRequestItemBtn").addEventListener("click", () => this.addRequestItem());
        document.getElementById("confirmRequestBtn").addEventListener("click", () => this.confirmRequest());
        document.getElementById("requestItemsList").addEventListener("click", (e) => {
            if (e.target.classList.contains("remove-request-item")) {
                this.removeRequestItem(e.target.dataset.productId);
            }
        });
    }
}

// ===================== Inicialização =====================
document.addEventListener('DOMContentLoaded', () => {
    const inventorySystem = new InventorySystem();
    window.inventorySystem = inventorySystem; // só para depuração no console
});
