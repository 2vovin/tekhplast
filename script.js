document.addEventListener('DOMContentLoaded', function() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const generateBtn = document.getElementById('generateBtn');
    const downloadExample = document.getElementById('downloadExample');
    const notification = document.getElementById('notification');
    const startNowBtn = document.getElementById('startNowBtn');
    
    let excelData = null;
    let sellerInfo = null;
    
    // Обработчики событий
    dropZone.addEventListener('click', () => fileInput.click());
    
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#4e54c8';
        dropZone.style.backgroundColor = '#e9f0ff';
    });
    
    dropZone.addEventListener('dragleave', () => {
        dropZone.style.borderColor = '#e2e8f0';
        dropZone.style.backgroundColor = '#f8fafc';
    });
    
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#e2e8f0';
        dropZone.style.backgroundColor = '#f8fafc';
        
        if (e.dataTransfer.files.length) {
            const file = e.dataTransfer.files[0];
            if (validateFile(file)) {
                fileInput.files = e.dataTransfer.files;
                handleFile(file);
            } else {
                showNotification('Неподдерживаемый формат файла', true);
            }
        }
    });
    
    fileInput.addEventListener('change', () => {
        if (fileInput.files.length) {
            const file = fileInput.files[0];
            if (validateFile(file)) {
                handleFile(file);
            } else {
                showNotification('Неподдерживаемый формат файла', true);
            }
        }
    });
    
    generateBtn.addEventListener('click', () => {
        if (!excelData || excelData.length === 0) {
            showNotification('Сначала загрузите файл', true);
            return;
        }
        
        showProductsModal();
    });
    
    downloadExample.addEventListener('click', (e) => {
        e.preventDefault();
        downloadExampleFile();
    });
    
    startNowBtn.addEventListener('click', () => {
        const uploadSection = document.querySelector('.upload-section');
        uploadSection.scrollIntoView({ behavior: 'smooth' });
    });
    
    function validateFile(file) {
        const validTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'text/csv'];
        const validExtensions = ['.xlsx', '.xls', '.csv'];
        const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
        return validTypes.includes(file.type) || validExtensions.includes(extension);
    }
    
    function handleFile(file) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                
                // Читаем данные как массив массивов для обработки структуры
                const dataArray = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
                
                // Извлекаем информацию о продавце (первые 5 строк)
                sellerInfo = {};
                for (let i = 0; i < 5 && i < dataArray.length; i++) {
                    if (dataArray[i] && dataArray[i].length >= 2) {
                        const key = dataArray[i][0];
                        const value = dataArray[i][1];
                        if (key && value) sellerInfo[key] = value;
                    }
                }
                
                // Валидация обязательных полей продавца
                if (!sellerInfo['Продавец'] || !sellerInfo['Телефон'] || !sellerInfo['Email']) {
                    showNotification('Отсутствуют обязательные данные продавца: Продавец, Телефон, Email', true);
                    return;
                }
                
                // Обрабатываем каталог товаров (начиная с 6 строки)
                const catalogData = [];
                let currentCategory = '';
                
                // Пропускаем первые 5 строк и строку с заголовками (6-я строка)
                for (let i = 6; i < dataArray.length; i++) {
                    const row = dataArray[i];
                    if (!row || row.length === 0) continue; // Пропускаем пустые строки
                    
                    // Определяем категорию (если указана - используем, иначе берем предыдущую)
                    if (row[0] && row[0].toString().trim() !== '') {
                        currentCategory = row[0].toString().trim();
                    }
                    
                    // Пропускаем строки без категории (в начале файла)
                    if (!currentCategory) continue;
                    
                    // Создаем объект товара
                    const product = {
                        'Категория': currentCategory,
                        'Название товара': row[1] ? row[1].toString() : 'Без названия',
                        'Характеристики': row[2] ? row[2].toString() : '',
                        'Цена': row[3] ? row[3].toString() : 'Не указана',
                        'Ссылка на изображение': row[4] ? row[4].toString() : ''
                    };
                    
                    // Валидация обязательных полей товара
                    if (!product['Название товара'] || product['Название товара'] === 'Без названия') {
                        showNotification(`В строке ${i+1} отсутствует название товара`, true);
                        continue;
                    }
                    
                    if (!product['Цена'] || product['Цена'] === 'Не указана') {
                        showNotification(`В строке ${i+1} отсутствует цена`, true);
                        continue;
                    }
                    
                    catalogData.push(product);
                }
                
                if (catalogData.length === 0) {
                    showNotification('Не найдено товаров для обработки', true);
                    return;
                }
                
                // Сохраняем данные
                excelData = catalogData;
                
                showNotification('Файл успешно загружен!');
                generateBtn.disabled = false;
            } catch (error) {
                showNotification('Ошибка при чтении файла', true);
                console.error(error);
            }
        };
        
        reader.readAsArrayBuffer(file);
    }
    
    function showProductsModal() {
        if (!excelData || excelData.length === 0) {
            showNotification('Нет данных для отображения', true);
            return;
        }
        
        // Создаем новое окно
        const newWindow = window.open('', '_blank');
        newWindow.document.write(`
            <!DOCTYPE html>
            <html lang="ru">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${sellerInfo['Продавец'] || 'Каталог товаров'}</title>
                <script src="https://cdn.jsdelivr.net/npm/dompurify@3.0.6/dist/purify.min.js"></script>
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
                <style>
                    body {
                        font-family: 'Inter', sans-serif;
                        background: #f8fafc;
                        color: #1e293b;
                        line-height: 1.6;
                        margin: 0;
                        padding: 0;
                    }
                    
                    .container {
                        max-width: 1200px;
                        margin: 0 auto;
                        padding: 0 20px;
                    }
                    
                    .seller-header {
                        background: #1e293b;
                        color: white;
                        padding: 20px 0;
                        margin-bottom: 30px;
                    }
                    
                    .seller-info {
                        display: flex;
                        justify-content: space-between;
                        flex-wrap: wrap;
                        gap: 20px;
                    }
                    
                    .seller-contacts {
                        display: flex;
                        flex-direction: column;
                        gap: 10px;
                    }
                    
                    .seller-contacts p {
                        margin: 0;
                        display: flex;
                        align-items: center;
                        gap: 10px;
                    }
                    
                    .modal-header {
                        text-align: center;
                        margin-bottom: 40px;
                        padding-bottom: 20px;
                        border-bottom: 1px solid #e2e8f0;
                    }
                    
                    .modal-header h2 {
                        font-size: 32px;
                        font-weight: 800;
                        color: #1e293b;
                        margin-bottom: 15px;
                    }
                    
                    .modal-header p {
                        font-size: 18px;
                        color: #64748b;
                        max-width: 600px;
                        margin: 0 auto;
                    }
                    
                    .modal-products-grid {
                        display: block;
                    }
                    
                    .category-title {
                        font-size: 24px;
                        font-weight: 700;
                        color: #1e293b;
                        margin: 40px 0 20px;
                        background: rgba(78, 84, 200, 0.1);
                        padding: 15px;
                        border-radius: 8px;
                    }
                    
                    .category-products {
                        display: grid;
                        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                        gap: 25px;
                        margin-bottom: 40px;
                    }
                    
                    .product-card {
                        background: #fff;
                        border-radius: 12px;
                        padding: 20px;
                        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
                        border: 1px solid #e2e8f0;
                        cursor: pointer;
                        transition: transform 0.3s, box-shadow 0.3s;
                    }
                    
                    .product-card:hover {
                        transform: translateY(-5px);
                        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
                    }
                    
                    .product-image {
                        width: 100%;
                        height: 200px;
                        object-fit: contain;
                        border-radius: 8px;
                        margin-bottom: 15px;
                    }
                    
                    .product-name {
                        font-weight: 700;
                        font-size: 18px;
                        color: #1e293b;
                        margin-bottom: 10px;
                    }
                    
                    .product-price {
                        color: #4e54c8;
                        font-weight: 700;
                        font-size: 18px;
                        margin: 10px 0;
                    }
                    
                    .product-desc {
                        color: #64748b;
                        font-size: 14px;
                        line-height: 1.5;
                    }
                    
                    footer {
                        background: #1e293b;
                        color: #fff;
                        padding: 40px 0;
                        margin-top: 60px;
                    }
                    
                    .footer-content {
                        display: flex;
                        justify-content: space-between;
                        flex-wrap: wrap;
                        gap: 30px;
                    }
                    
                    .footer-left {
                        flex: 1;
                        min-width: 300px;
                    }
                    
                    .footer-right {
                        flex: 1;
                        min-width: 300px;
                        display: flex;
                        flex-direction: column;
                        align-items: flex-end;
                        text-align: right;
                    }
                    
                    .footer-left h3, .footer-right h3 {
                        font-size: 20px;
                        margin-bottom: 15px;
                        color: #fff;
                    }
                    
                    .footer-left p, .footer-right p {
                        margin: 8px 0;
                        display: flex;
                        align-items: center;
                        gap: 10px;
                    }
                    
                    .footer-right p {
                        flex-direction: row-reverse;
                    }
                    
                    .footer-bottom {
                        text-align: center;
                        margin-top: 40px;
                        padding-top: 20px;
                        border-top: 1px solid rgba(255, 255, 255, 0.1);
                    }
                    
                    /* Стили для модального окна товара */
                    .product-modal {
                        display: none;
                        position: fixed;
                        z-index: 2000;
                        left: 0;
                        top: 0;
                        width: 100%;
                        height: 100%;
                        background-color: rgba(0, 0, 0, 0.5);
                    }
                    
                    .product-modal-content {
                        background-color: #fff;
                        margin: 5% auto;
                        padding: 30px;
                        border-radius: 12px;
                        max-width: 900px;
                        width: 90%;
                        max-height: 80vh;
                        overflow-y: auto;
                        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                        position: relative;
                    }
                    
                    .product-modal-close {
                        position: absolute;
                        top: 15px;
                        right: 15px;
                        font-size: 28px;
                        color: #64748b;
                        cursor: pointer;
                        z-index: 10;
                    }
                    
                    .product-modal-body {
                        display: flex;
                        gap: 30px;
                        margin-top: 20px;
                    }
                    
                    .product-modal-image {
                        flex: 1;
                        min-width: 300px;
                    }
                    
                    .product-modal-image img {
                        width: 100%;
                        height: auto;
                        border-radius: 8px;
                        object-fit: contain;
                        max-height: 400px;
                    }
                    
                    .product-modal-info {
                        flex: 1;
                    }
                    
                    .product-modal-info h2 {
                        font-size: 28px;
                        margin-bottom: 15px;
                        color: #1e293b;
                    }
                    
                    .product-modal-info .price {
                        font-size: 20px;
                        font-weight: 700;
                        margin: 10px 0;
                    }
                    
                    .product-modal-info .retail-price {
                        color: #4e54c8;
                    }
                    
                    .product-modal-info p {
                        margin: 15px 0;
                        line-height: 1.6;
                        color: #64748b;
                    }
                    
                    .product-modal-details {
                        margin-top: 20px;
                        padding-top: 20px;
                        border-top: 1px solid #e2e8f0;
                    }
                    
                    .product-modal-details p {
                        margin: 8px 0;
                        font-size: 14px;
                    }
                    
                    /* Адаптивность для модального окна */
                    @media (max-width: 768px) {
                        .product-modal-body {
                            flex-direction: column;
                        }
                        
                        .product-modal-image {
                            min-width: auto;
                        }
                        
                        .product-modal-content {
                            width: 95%;
                            padding: 20px;
                            margin: 10% auto;
                        }
                        
                        .footer-content {
                            flex-direction: column;
                        }
                        
                        .footer-left, .footer-right {
                            min-width: auto;
                            align-items: flex-start;
                            text-align: left;
                        }
                        
                        .footer-right p {
                            flex-direction: row;
                        }
                    }
                </style>
            </head>
            <body>
                <header class="seller-header">
                    <div class="container">
                        <div class="seller-info">
                            <div class="seller-name">
                                <h1>${DOMPurify.sanitize(sellerInfo['Продавец'] || 'Каталог товаров'}</h1>
                            </div>
                            <div class="seller-contacts">
                                ${sellerInfo['Телефон'] ? `<p><i class="fas fa-phone"></i> ${DOMPurify.sanitize(sellerInfo['Телефон'])}</p>` : ''}
                                ${sellerInfo['Email'] ? `<p><i class="fas fa-envelope"></i> ${DOMPurify.sanitize(sellerInfo['Email'])}</p>` : ''}
                                ${sellerInfo['Адрес'] ? `<p><i class="fas fa-map-marker-alt"></i> ${DOMPurify.sanitize(sellerInfo['Адрес'])}</p>` : ''}
                                ${sellerInfo['Сайт'] ? `<p><i class="fas fa-globe"></i> ${DOMPurify.sanitize(sellerInfo['Сайт'])}</p>` : ''}
                            </div>
                        </div>
                    </div>
                </header>
                
                <div class="container">
                    <div class="modal-header">
                        <h2>Каталог товары</h2>
                        <p>Актуальные предложения от ${DOMPurify.sanitize(sellerInfo['Продавец'] || 'нашего магазина')}</p>
                    </div>
                    <div class="modal-products-grid" id="modalProductsGrid"></div>
                </div>
                
                <!-- Модальное окно товара -->
                <div id="productModal" class="product-modal">
                    <div class="product-modal-content">
                        <span class="product-modal-close">&times;</span>
                        <div class="product-modal-body">
                            <div class="product-modal-image">
                                <img id="modalImage" src="" alt="">
                            </div>
                            <div class="product-modal-info">
                                <h2 id="modalTitle"></h2>
                                <div id="modalPrices"></div>
                                <p id="modalDescription"></p>
                                <div id="modalDetails" class="product-modal-details"></div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <footer>
                    <div class="container">
                        <div class="footer-content">
                            <div class="footer-left">
                                <h3>${DOMPurify.sanitize(sellerInfo['Продавец'] || 'Каталог товаров')}</h3>
                                ${sellerInfo['Адрес'] ? `<p><i class="fas fa-map-marker-alt"></i> ${DOMPurify.sanitize(sellerInfo['Адрес'])}</p>` : ''}
                            </div>
                            <div class="footer-right">
                                <h3>Контакты</h3>
                                ${sellerInfo['Телефон'] ? `<p><i class="fas fa-phone"></i> ${DOMPurify.sanitize(sellerInfo['Телефон'])}</p>` : ''}
                                ${sellerInfo['Email'] ? `<p><i class="fas fa-envelope"></i> ${DOMPurify.sanitize(sellerInfo['Email'])}</p>` : ''}
                                ${sellerInfo['Сайт'] ? `<p><i class="fas fa-globe"></i> ${DOMPurify.sanitize(sellerInfo['Сайт'])}</p>` : ''}
                            </div>
                        </div>
                        <div class="footer-bottom">
                            <p>© 2023 ${DOMPurify.sanitize(sellerInfo['Продавец'] || 'ExcelToSite')}. Все права защищены.</p>
                        </div>
                    </div>
                </footer>
                
                <script>
                    // Функции для работы с модальным окном
                    function openProductModal(item) {
                        const modal = document.getElementById('productModal');
                        const modalImage = document.getElementById('modalImage');
                        const modalTitle = document.getElementById('modalTitle');
                        const modalPrices = document.getElementById('modalPrices');
                        const modalDescription = document.getElementById('modalDescription');
                        const modalDetails = document.getElementById('modalDetails');
                        
                        // Заполняем данные
                        const name = item['Название товара'] || 'Без названия';
                        const price = item['Цена'] || 'Не указана';
                        const description = item['Характеристики'] || 'Нет описания';
                        const image = item['Ссылка на изображение'] || '';
                        const category = item['Категория'] || '';
                        
                        // Устанавливаем значения
                        modalTitle.textContent = name;
                        modalDescription.textContent = description;
                        
                        if (image) {
                            modalImage.src = image;
                            modalImage.alt = name;
                        } else {
                            modalImage.src = 'https://via.placeholder.com/400x300?text=Нет+изображения';
                            modalImage.alt = 'Нет изображения';
                        }
                        
                        // Формируем блок с ценами
                        let pricesHTML = '';
                        if (price && price !== 'Не указана') {
                            pricesHTML += '<div class="price retail-price">' + price + '</div>';
                        }
                        modalPrices.innerHTML = pricesHTML;
                        
                        // Формируем дополнительные детали
                        let detailsHTML = '';
                        if (category) {
                            detailsHTML += '<p><strong>Категория:</strong> ' + category + '</p>';
                        }
                        modalDetails.innerHTML = detailsHTML;
                        
                        // Показываем модальное окно
                        modal.style.display = 'block';
                        document.body.style.overflow = 'hidden';
                    }
                    
                    function closeProductModal() {
                        document.getElementById('productModal').style.display = 'none';
                        document.body.style.overflow = 'auto';
                    }
                    
                    // Обработчики событий для закрытия модального окна
                    document.querySelector('.product-modal-close').addEventListener('click', closeProductModal);
                    
                    window.addEventListener('click', function(event) {
                        if (event.target === document.getElementById('productModal')) {
                            closeProductModal();
                        }
                    });
                    
                    document.addEventListener('keydown', function(event) {
                        if (event.key === 'Escape') {
                            closeProductModal();
                        }
                    });
                </script>
            </body>
            </html>
        `);
        
        const modalProductsGrid = newWindow.document.getElementById('modalProductsGrid');
        const modalData = excelData.slice(0, 12);
        
        // Группировка товаров по категориям
        const groupedByCategory = modalData.reduce((acc, item) => {
            const category = item['Категория'] || 'Без категории';
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push(item);
            return acc;
        }, {});
        
        // Сортировка категорий по алфавиту
        const sortedCategories = Object.keys(groupedByCategory).sort();
        
        // Создание заголовков и карточек для каждой категории
        sortedCategories.forEach(category => {
            const categoryHeader = newWindow.document.createElement('h3');
            categoryHeader.className = 'category-title';
            categoryHeader.textContent = DOMPurify.sanitize(category);
            modalProductsGrid.appendChild(categoryHeader);
            
            const categoryGrid = newWindow.document.createElement('div');
            categoryGrid.className = 'category-products';
            groupedByCategory[category].forEach(item => {
                const card = createProductCard(newWindow, item);
                categoryGrid.appendChild(card);
            });
            modalProductsGrid.appendChild(categoryGrid);
        });
    }
    
    function createProductCard(windowContext, item) {
        const card = windowContext.document.createElement('div');
        card.className = 'product-card';
        
        // Добавляем обработчик клика для открытия модального окна
        card.addEventListener('click', () => {
            windowContext.openProductModal(item);
        });
        
        const name = item['Название товара'] || 'Без названия';
        const price = item['Цена'] || 'Не указана';
        const description = item['Характеристики'] || 'Нет описания';
        const image = item['Ссылка на изображение'] || '';
        
        const safeName = DOMPurify.sanitize(name);
        const safePrice = DOMPurify.sanitize(price.toString());
        const safeDescription = DOMPurify.sanitize(description);
        
        card.innerHTML = `
            ${image ? `<img src="${DOMPurify.sanitize(image)}" alt="${safeName}" class="product-image">` : '<div class="product-image" style="background: #f1f5f9; display: flex; align-items: center; justify-content: center;"><i class="fas fa-image" style="font-size: 48px; color: #cbd5e1;"></i></div>'}
            <div class="product-name">${safeName}</div>
            <div class="product-price">${safePrice}</div>
            <div class="product-desc">${safeDescription}</div>
        `;
        
        return card;
    }
    
    function downloadExampleFile() {
        const exampleData = [
            ['Продавец', 'ООО "ТехноМаркет"'],
            ['Телефон', '+7 (999) 123-45-67'],
            ['Email', 'info@technomarket.ru'],
            ['Адрес', 'г. Москва, ул. Ленина, 10'],
            ['Сайт', 'www.technomarket.ru'],
            ['Категория', 'Название товара', 'Характеристики', 'Цена', 'Ссылка на изображение'],
            ['Чайники', 'Bosch TWK3A011', '1.7 л, 2200 Вт', '2500₽', 'https://via.placeholder.com/300x200?text=Bosch'],
            ['', 'Philips HD4646', '1.5 л, 2000 Вт', '2300₽', 'https://via.placeholder.com/300x200?text=Philips'],
            ['Холодильники', 'Samsung RB37A5200', '367 л, No Frost', '42000₽', 'https://via.placeholder.com/300x200?text=Samsung'],
            ['', 'LG GA-B419', '312 л, класс A+', '38500₽', 'https://via.placeholder.com/300x200?text=LG']
        ];
        
        const worksheet = XLSX.utils.aoa_to_sheet(exampleData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Товары');
        
        try {
            XLSX.writeFile(workbook, 'пример_прайс_листа.xlsx');
            showNotification('Пример файла скачан!');
        } catch (error) {
            showNotification('Ошибка при скачивании файла', true);
            console.error(error);
        }
    }
    
    function showNotification(message, isError = false) {
        notification.querySelector('span').textContent = message;
        notification.classList.toggle('error', isError);
        notification.classList.add('show');
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }
});