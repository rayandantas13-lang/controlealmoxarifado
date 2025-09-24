// Sistema de Controle de Estoque - JavaScript

class InventorySystem {
    constructor() {
        this.products = [];
        this.editingIndex = -1;
        this.init();
    }

    init() {
        this.loadProducts();
        this.bindEvents();
        this.displayProducts();
        this.updateSummary();
    }

    // Carregar produtos do localStorage
    loadProducts() {
        const savedProducts = localStorage.getItem('inventory_products');
        if (savedProducts) {
            this.products = JSON.parse(savedProducts);
        }
    }

    // Salvar produtos no localStorage
    saveProducts() {
        localStorage.setItem('inventory_products', JSON.stringify(this.products));
    }

    // Vincular eventos aos elementos
    bindEvents() {
        const form = document.getElementById('product-form');
        const searchInput = document.getElementById('search-input');
        const cancelBtn = document.getElementById('cancel-btn');
        const confirmDelete = document.getElementById('confirm-delete');
        const cancelDelete = document.getElementById('cancel-delete');

        form.addEventListener('submit', (e) => this.handleFormSubmit(e));
        searchInput.addEventListener('input', (e) => this.handleSearch(e));
        cancelBtn.addEventListener('click', () => this.cancelEdit());
        confirmDelete.addEventListener('click', () => this.confirmDelete());
        cancelDelete.addEventListener('click', () => this.closeModal());

        // Fechar modal ao clicar fora dele
        document.getElementById('confirm-modal').addEventListener('click', (e) => {
            if (e.target.id === 'confirm-modal') {
                this.closeModal();
            }
        });
    }

    // Manipular envio do formulário
    handleFormSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const product = {
            id: this.editingIndex >= 0 ? this.products[this.editingIndex].id : Date.now(),
            name: formData.get('name').trim(),
            code: formData.get('code').trim(),
            category: formData.get('category'),
            quantity: parseInt(formData.get('quantity')),
            price: parseFloat(formData.get('price')),
            description: formData.get('description').trim(),
            createdAt: this.editingIndex >= 0 ? this.products[this.editingIndex].createdAt : new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // Validar se o código já existe (exceto para o produto sendo editado)
        const existingProduct = this.products.find((p, index) => 
            p.code === product.code && index !== this.editingIndex
        );

        if (existingProduct) {
            this.showMessage('Código do produto já existe!', 'error');
            return;
        }

        if (this.editingIndex >= 0) {
            // Editar produto existente
            this.products[this.editingIndex] = product;
            this.showMessage('Produto atualizado com sucesso!', 'success');
        } else {
            // Adicionar novo produto
            this.products.push(product);
            this.showMessage('Produto adicionado com sucesso!', 'success');
        }

        this.saveProducts();
        this.displayProducts();
        this.updateSummary();
        this.resetForm();
    }

    // Exibir produtos na tabela
    displayProducts(productsToShow = null) {
        const tbody = document.getElementById('products-tbody');
        const products = productsToShow || this.products;

        if (products.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 40px; color: #7f8c8d;">
                        <strong>Nenhum produto encontrado</strong><br>
                        <small>Adicione produtos usando o formulário ao lado</small>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = products.map((product, index) => {
            const totalValue = (product.quantity * product.price).toFixed(2);
            const stockClass = this.getStockClass(product.quantity);
            const originalIndex = productsToShow ? this.products.indexOf(product) : index;

            return `
                <tr class="${stockClass}">
                    <td><strong>${product.code}</strong></td>
                    <td>${product.name}</td>
                    <td>
                        <span class="category-badge">${product.category}</span>
                    </td>
                    <td>
                        <span class="quantity ${this.getQuantityClass(product.quantity)}">
                            ${product.quantity}
                        </span>
                    </td>
                    <td>R$ ${product.price.toFixed(2)}</td>
                    <td><strong>R$ ${totalValue}</strong></td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-edit" onclick="inventory.editProduct(${originalIndex})" title="Editar produto">
                                ✏️ Editar
                            </button>
                            <button class="btn-delete" onclick="inventory.deleteProduct(${originalIndex})" title="Excluir produto">
                                🗑️ Excluir
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // Obter classe CSS baseada no estoque
    getStockClass(quantity) {
        if (quantity === 0) return 'out-of-stock';
        if (quantity <= 5) return 'low-stock';
        return '';
    }

    // Obter classe CSS para quantidade
    getQuantityClass(quantity) {
        if (quantity === 0) return 'zero';
        if (quantity <= 5) return 'low';
        return 'normal';
    }

    // Buscar produtos
    handleSearch(e) {
        const searchTerm = e.target.value.toLowerCase().trim();
        
        if (searchTerm === '') {
            this.displayProducts();
            return;
        }

        const filteredProducts = this.products.filter(product => 
            product.name.toLowerCase().includes(searchTerm) ||
            product.code.toLowerCase().includes(searchTerm) ||
            product.category.toLowerCase().includes(searchTerm) ||
            product.description.toLowerCase().includes(searchTerm)
        );

        this.displayProducts(filteredProducts);
    }

    // Editar produto
    editProduct(index) {
        const product = this.products[index];
        this.editingIndex = index;

        // Preencher formulário
        document.getElementById('product-name').value = product.name;
        document.getElementById('product-code').value = product.code;
        document.getElementById('product-category').value = product.category;
        document.getElementById('product-quantity').value = product.quantity;
        document.getElementById('product-price').value = product.price;
        document.getElementById('product-description').value = product.description;

        // Alterar botão e mostrar cancelar
        const submitBtn = document.getElementById('submit-btn');
        const cancelBtn = document.getElementById('cancel-btn');
        
        submitBtn.textContent = 'Atualizar Produto';
        submitBtn.style.background = 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)';
        cancelBtn.style.display = 'block';

        // Scroll para o formulário
        document.querySelector('.form-section').scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
    }

    // Cancelar edição
    cancelEdit() {
        this.resetForm();
    }

    // Resetar formulário
    resetForm() {
        document.getElementById('product-form').reset();
        this.editingIndex = -1;

        const submitBtn = document.getElementById('submit-btn');
        const cancelBtn = document.getElementById('cancel-btn');
        
        submitBtn.textContent = 'Adicionar Produto';
        submitBtn.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        cancelBtn.style.display = 'none';
    }

    // Excluir produto
    deleteProduct(index) {
        this.productToDelete = index;
        this.showModal();
    }

    // Mostrar modal de confirmação
    showModal() {
        document.getElementById('confirm-modal').style.display = 'block';
    }

    // Fechar modal
    closeModal() {
        document.getElementById('confirm-modal').style.display = 'none';
        this.productToDelete = -1;
    }

    // Confirmar exclusão
    confirmDelete() {
        if (this.productToDelete >= 0) {
            const product = this.products[this.productToDelete];
            this.products.splice(this.productToDelete, 1);
            this.saveProducts();
            this.displayProducts();
            this.updateSummary();
            this.showMessage(`Produto "${product.name}" excluído com sucesso!`, 'success');
            
            // Se estava editando o produto excluído, resetar formulário
            if (this.editingIndex === this.productToDelete) {
                this.resetForm();
            } else if (this.editingIndex > this.productToDelete) {
                this.editingIndex--;
            }
        }
        this.closeModal();
    }

    // Atualizar resumo
    updateSummary() {
        const totalProducts = this.products.length;
        const totalValue = this.products.reduce((sum, product) => 
            sum + (product.quantity * product.price), 0
        );

        document.getElementById('total-products').textContent = totalProducts;
        document.getElementById('total-value').textContent = 
            `R$ ${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    }

    // Mostrar mensagem
    showMessage(message, type = 'success') {
        // Remover mensagem anterior se existir
        const existingMessage = document.querySelector('.message');
        if (existingMessage) {
            existingMessage.remove();
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}-message`;
        messageDiv.textContent = message;

        const formSection = document.querySelector('.form-section');
        formSection.insertBefore(messageDiv, formSection.firstChild);

        // Remover mensagem após 3 segundos
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.remove();
            }
        }, 3000);
    }

    // Exportar dados para CSV
    exportToCSV() {
        if (this.products.length === 0) {
            this.showMessage('Nenhum produto para exportar!', 'error');
            return;
        }

        const headers = ['Código', 'Nome', 'Categoria', 'Quantidade', 'Preço', 'Valor Total', 'Descrição'];
        const csvContent = [
            headers.join(','),
            ...this.products.map(product => [
                `"${product.code}"`,
                `"${product.name}"`,
                `"${product.category}"`,
                product.quantity,
                product.price.toFixed(2),
                (product.quantity * product.price).toFixed(2),
                `"${product.description}"`
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `estoque_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.showMessage('Dados exportados com sucesso!', 'success');
    }

    // Importar dados de CSV
    importFromCSV(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const csv = e.target.result;
                const lines = csv.split('\n');
                const headers = lines[0].split(',');
                
                const importedProducts = [];
                for (let i = 1; i < lines.length; i++) {
                    if (lines[i].trim() === '') continue;
                    
                    const values = lines[i].split(',');
                    const product = {
                        id: Date.now() + i,
                        code: values[0].replace(/"/g, ''),
                        name: values[1].replace(/"/g, ''),
                        category: values[2].replace(/"/g, ''),
                        quantity: parseInt(values[3]),
                        price: parseFloat(values[4]),
                        description: values[6] ? values[6].replace(/"/g, '') : '',
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    };
                    
                    importedProducts.push(product);
                }
                
                this.products = [...this.products, ...importedProducts];
                this.saveProducts();
                this.displayProducts();
                this.updateSummary();
                this.showMessage(`${importedProducts.length} produtos importados com sucesso!`, 'success');
                
            } catch (error) {
                this.showMessage('Erro ao importar arquivo CSV!', 'error');
            }
        };
        reader.readAsText(file);
    }

    // Limpar todos os dados
    clearAllData() {
        if (confirm('Tem certeza que deseja excluir todos os produtos? Esta ação não pode ser desfeita.')) {
            this.products = [];
            this.saveProducts();
            this.displayProducts();
            this.updateSummary();
            this.resetForm();
            this.showMessage('Todos os produtos foram excluídos!', 'success');
        }
    }
}

// Adicionar estilos CSS adicionais via JavaScript
const additionalStyles = `
    .category-badge {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 0.8rem;
        font-weight: 500;
    }

    .quantity.zero {
        color: #e74c3c;
        font-weight: bold;
    }

    .quantity.low {
        color: #f39c12;
        font-weight: bold;
    }

    .quantity.normal {
        color: #27ae60;
        font-weight: bold;
    }

    .message {
        padding: 12px 15px;
        border-radius: 8px;
        margin-bottom: 20px;
        font-weight: 500;
        animation: slideDown 0.3s ease;
    }

    .success-message {
        background: #2ecc71;
        color: white;
    }

    .error-message {
        background: #e74c3c;
        color: white;
    }

    .toolbar {
        display: flex;
        gap: 10px;
        margin-bottom: 20px;
        flex-wrap: wrap;
    }

    .toolbar button {
        padding: 8px 15px;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font-size: 0.9rem;
        transition: all 0.3s ease;
    }

    .btn-export {
        background: #27ae60;
        color: white;
    }

    .btn-export:hover {
        background: #229954;
    }

    .btn-clear {
        background: #e74c3c;
        color: white;
    }

    .btn-clear:hover {
        background: #c0392b;
    }

    .file-input {
        display: none;
    }

    .btn-import {
        background: #3498db;
        color: white;
    }

    .btn-import:hover {
        background: #2980b9;
    }
`;

// Adicionar estilos ao documento
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);

// Inicializar sistema quando a página carregar
let inventory;

document.addEventListener('DOMContentLoaded', function() {
    inventory = new InventorySystem();
    
    // Adicionar barra de ferramentas
    const tableHeader = document.querySelector('.table-header');
    const toolbar = document.createElement('div');
    toolbar.className = 'toolbar';
    toolbar.innerHTML = `
        <button class="btn-export" onclick="inventory.exportToCSV()">📥 Exportar CSV</button>
        <label for="import-file" class="btn-import" style="cursor: pointer;">📤 Importar CSV</label>
        <input type="file" id="import-file" class="file-input" accept=".csv" onchange="handleFileImport(event)">
        <button class="btn-clear" onclick="inventory.clearAllData()">🗑️ Limpar Tudo</button>
    `;
    
    tableHeader.appendChild(toolbar);
});

// Função para lidar com importação de arquivo
function handleFileImport(event) {
    const file = event.target.files[0];
    if (file && file.type === 'text/csv') {
        inventory.importFromCSV(file);
    } else {
        inventory.showMessage('Por favor, selecione um arquivo CSV válido!', 'error');
    }
    event.target.value = ''; // Limpar input
}

// Atalhos de teclado
document.addEventListener('keydown', function(e) {
    // Ctrl + N para novo produto
    if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        document.getElementById('product-name').focus();
    }
    
    // Escape para cancelar edição
    if (e.key === 'Escape') {
        if (inventory.editingIndex >= 0) {
            inventory.cancelEdit();
        }
        inventory.closeModal();
    }
    
    // Ctrl + F para busca
    if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        document.getElementById('search-input').focus();
    }
});

// Adicionar tooltips e melhorias de acessibilidade
document.addEventListener('DOMContentLoaded', function() {
    // Adicionar placeholders informativos
    document.getElementById('product-name').placeholder = 'Ex: Notebook Dell Inspiron';
    document.getElementById('product-code').placeholder = 'Ex: NB001';
    document.getElementById('product-quantity').placeholder = '0';
    document.getElementById('product-price').placeholder = '0.00';
    document.getElementById('product-description').placeholder = 'Descrição detalhada do produto (opcional)';
});

