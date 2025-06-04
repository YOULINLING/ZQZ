// 移动端菜单切换
const menuToggle = document.getElementById('menu-toggle');
const mobileMenu = document.getElementById('mobile-menu');

menuToggle.addEventListener('click', () => {
    mobileMenu.classList.toggle('hidden');
});

// 当前筛选条件
let currentFilter = 'all';

// 图表实例
let scoreChart = null;

// 筛选器功能
const filterButtons = document.querySelectorAll('.filter-btn');
const rulerContainer = document.getElementById('ruler-container');

filterButtons.forEach(button => {
    button.addEventListener('click', () => {
        const filter = button.dataset.filter;
        currentFilter = filter;

        // 重置所有按钮样式
        filterButtons.forEach(btn => {
            btn.classList.remove('bg-primary', 'text-white');
            btn.classList.add('bg-white', 'text-primary', 'border', 'border-primary', 'hover:bg-primary/5');
        });

        // 设置当前按钮样式
        button.classList.remove('bg-white', 'text-primary', 'border', 'border-primary', 'hover:bg-primary/5');
        button.classList.add('bg-primary', 'text-white');

        // 筛选卡片
        const cards = document.querySelectorAll('.ruler-card');
        cards.forEach(card => {
            if (filter === 'all') {
                card.style.display = 'block';
            } else if (filter === 'high-score') {
                // 高分筛选
                const score = parseInt(card.querySelector('.text-2xl.font-bold').textContent);
                if (score >= 20) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            } else if (filter === 'low-score') {
                // 低分筛选
                const score = parseInt(card.querySelector('.text-2xl.font-bold').textContent);
                if (score <= 0) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            } else if (card.dataset.category.includes(filter)) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });

        // 更新图表和表格
        updateComparisonCharts();
    });
});

// 详情模态框
const detailModal = document.getElementById('detail-modal');
const closeModal = document.getElementById('close-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const modalTitle = document.getElementById('modal-title');
const modalContent = document.getElementById('modal-content');

closeModal.addEventListener('click', () => {
    detailModal.classList.add('hidden');
});

closeModalBtn.addEventListener('click', () => {
    detailModal.classList.add('hidden');
});

// 点击模态框外部关闭
detailModal.addEventListener('click', (e) => {
    if (e.target === detailModal) {
        detailModal.classList.add('hidden');
    }
});

// 掌权者数据
let rulersData = [];

// 显示加载指示器
function showLoadingIndicator() {
    rulerContainer.innerHTML = `
        <div class="col-span-full text-center py-16">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
            <p class="mt-4 text-gray-600">正在加载掌权者数据...</p>
        </div>
    `;
}

// 加载掌权者数据
async function loadRulersData() {
    // 显示加载指示器
    showLoadingIndicator();
    
    try {
        // 从不同目录加载数据
        const categories = [
            { folder: 'female_rulers', type: 'female_ruler' },
            { folder: 'founders', type: 'founder' },
            { folder: 'last', type: 'last' },
            { folder: 'modern', type: 'modern' }
        ];

        // 并行加载所有类别数据
        const rulerPromises = categories.map(async category => {
            try {
                // 获取该类别下的所有文件
                const response = await fetch(`data/${category.folder}/index.json`);
                if (!response.ok) {
                    throw new Error(`Failed to fetch ${category.folder} data: ${response.status}`);
                }

                const fileList = await response.json();
                
                // 并行加载该类别下的所有掌权者数据
                const rulerPromises = fileList.map(async fileName => {
                    try {
                        const rulerResponse = await fetch(`data/${category.folder}/${fileName}`);
                        if (!rulerResponse.ok) {
                            throw new Error(`Failed to fetch ${fileName}: ${rulerResponse.status}`);
                        }

                        const rulerData = await rulerResponse.json();
                        return { ...rulerData, category: category.type };
                    } catch (error) {
                        console.error(`Error loading ${fileName}:`, error);
                        return null;
                    }
                });

                // 等待该类别下所有掌权者数据加载完成
                const rulers = await Promise.all(rulerPromises);
                // 过滤掉加载失败的数据
                return rulers.filter(ruler => ruler !== null);
            } catch (error) {
                console.error(`Error loading ${category.folder}:`, error);
                return [];
            }
        });

        // 等待所有数据加载完成
        const allRulers = await Promise.all(rulerPromises);
        rulersData = allRulers.flat();

        // 渲染掌权者卡片
        renderRulerCards();

        // 初始化图表和表格
        updateComparisonCharts();

        // 添加滚动监听
        addScrollListener();
    } catch (error) {
        console.error('Failed to load rulers data:', error);
        rulerContainer.innerHTML = `
            <div class="col-span-full text-center py-16">
                <p class="text-red-500">加载数据失败: ${error.message}</p>
                <p class="mt-2 text-gray-500">请检查数据文件路径和格式是否正确</p>
                <button id="retry-load" class="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90">
                    <i class="fa fa-refresh mr-2"></i>重试
                </button>
            </div>
        `;
        
        // 添加重试按钮事件
        document.getElementById('retry-load')?.addEventListener('click', loadRulersData);
    }
}

// 渲染掌权者卡片
function renderRulerCards() {
    rulerContainer.innerHTML = '';

    if (rulersData.length === 0) {
        rulerContainer.innerHTML = `
            <div class="col-span-full text-center py-16">
                <p class="text-gray-500">没有找到掌权者数据</p>
            </div>
        `;
        return;
    }

    rulersData.forEach(ruler => {
        const card = document.createElement('div');
        card.className = 'ruler-card bg-white rounded-xl shadow-lg overflow-hidden card-hover';
        card.dataset.category = ruler.category;

        // 确定卡片颜色
        let categoryClass = '';
        if (ruler.category === 'female_ruler') {
            categoryClass = 'bg-pink-50';
        } else if (ruler.category === 'founder') {
            categoryClass = 'bg-green-50';
        } else if (ruler.category === 'last') {
            categoryClass = 'bg-red-50';
        } else if (ruler.category === 'modern') {
            categoryClass = 'bg-blue-50';
        }

        card.classList.add(categoryClass);

        // 确定评分颜色
        let scoreColor = 'text-primary';
        if (ruler.total_score < 0) {
            scoreColor = 'text-red-600';
        } else if (ruler.total_score < 20) {
            scoreColor = 'text-green-600';
        }

        // 构建卡片HTML
        card.innerHTML = `
            <div class="relative h-64">
                <img src="https://picsum.photos/id/${Math.floor(Math.random() * 100)}/800/600" alt="${ruler.name}画像" class="w-full h-full object-cover">
                <div class="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end">
                    <div class="p-6">
                        <h3 class="text-2xl font-bold text-white">${ruler.name}</h3>
                        <p class="text-gray-200">${ruler.dynasty}（${ruler.life_span}）</p>
                    </div>
                </div>
            </div>
            <div class="p-6">
                <div class="flex justify-between items-center mb-4">
                    <div class="flex items-center">
                        <span class="bg-primary/10 text-primary text-sm font-medium px-2.5 py-0.5 rounded">${getCategoryLabel(ruler.category)}</span>
                    </div>
                    <div class="flex items-center">
                        <span class="text-2xl font-bold ${scoreColor}">${ruler.total_score >= 0 ? '+' + ruler.total_score : ruler.total_score}</span>
                        <div class="ml-2 flex">
                            ${getStarRating(ruler.total_score)}
                        </div>
                    </div>
                </div>
                <div class="mb-4">
                    <h4 class="font-semibold text-lg mb-2">加分项（+${ruler.positive_points?.score || 0}）</h4>
                    <ul class="text-gray-600 space-y-1">
                        ${ruler.positive_points?.items?.map(item => `
                            <li class="flex items-start">
                                <i class="fa fa-plus-circle text-green-500 mt-1 mr-2"></i>
                                <span>${item.title}：${item.description}</span>
                            </li>
                        `).join('') || '<li class="text-gray-400">无</li>'}
                    </ul>
                </div>
                <div class="mb-4">
                    <h4 class="font-semibold text-lg mb-2">扣分项（${ruler.negative_points?.score || 0}）</h4>
                    <ul class="text-gray-600 space-y-1">
                        ${ruler.negative_points?.items?.map(item => `
                            <li class="flex items-start">
                                <i class="fa fa-minus-circle text-red-500 mt-1 mr-2"></i>
                                <span>${item.title}：${item.description}</span>
                            </li>
                        `).join('') || '<li class="text-gray-400">无</li>'}
                    </ul>
                </div>
                <button class="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
                    onclick="showRulerDetails('${ruler.name}')">
                    查看详情 <i class="fa fa-arrow-right ml-1"></i>
                </button>
            </div>
        `;

        rulerContainer.appendChild(card);
    });

    // 初始应用筛选条件
    applyCurrentFilter();
}

// 应用当前筛选条件
function applyCurrentFilter() {
    const cards = document.querySelectorAll('.ruler-card');
    cards.forEach(card => {
        if (currentFilter === 'all') {
            card.style.display = 'block';
        } else if (currentFilter === 'high-score') {
            // 高分筛选
            const score = parseInt(card.querySelector('.text-2xl.font-bold').textContent);
            if (score >= 20) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        } else if (currentFilter === 'low-score') {
            // 低分筛选
            const score = parseInt(card.querySelector('.text-2xl.font-bold').textContent);
            if (score <= 0) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        } else if (card.dataset.category.includes(currentFilter)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// 获取类别标签
function getCategoryLabel(category) {
    const labels = {
        'female_ruler': '女性掌权者',
        'founder': '开国皇帝',
        'last': '末代皇帝',
        'modern': '近代掌权者'
    };
    return labels[category] || category;
}

// 获取星级评分
function getStarRating(score) {
    // 将分数映射到0-5星
    const normalizedScore = Math.max(0, Math.min(5, (score + 100) / 40));
    const fullStars = Math.floor(normalizedScore);
    const halfStar = normalizedScore % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

    let starsHtml = '';
    for (let i = 0; i < fullStars; i++) {
        starsHtml += '<i class="fa fa-star text-yellow-400"></i>';
    }
    if (halfStar) {
        starsHtml += '<i class="fa fa-star-half-o text-yellow-400"></i>';
    }
    for (let i = 0; i < emptyStars; i++) {
        starsHtml += '<i class="fa fa-star-o text-gray-300"></i>';
    }

    return starsHtml;
}

// 显示掌权者详情
function showRulerDetails(name) {
    const ruler = rulersData.find(r => r.name === name);
    if (!ruler) {
        alert('未找到该掌权者信息');
        return;
    }

    // 设置模态框标题
    modalTitle.textContent = ruler.name;

    // 设置模态框内容
    modalContent.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="md:col-span-1">
                <div class="bg-gray-100 rounded-xl overflow-hidden">
                    <img src="https://picsum.photos/id/${Math.floor(Math.random() * 100)}/800/1000" alt="${ruler.name}画像" class="w-full h-auto">
                    <div class="p-4">
                        <h4 class="font-semibold text-lg mb-2">基本信息</h4>
                        <ul class="space-y-2 text-gray-600">
                            <li class="flex">
                                <span class="w-24 text-gray-500">朝代：</span>
                                <span>${ruler.dynasty}</span>
                            </li>
                            <li class="flex">
                                <span class="w-24 text-gray-500">生卒年：</span>
                                <span>${ruler.life_span}</span>
                            </li>
                            <li class="flex">
                                <span class="w-24 text-gray-500">称号：</span>
                                <span>${ruler.title}</span>
                            </li>
                            <li class="flex">
                                <span class="w-24 text-gray-500">统治时长：</span>
                                <span>${ruler.reign_period}</span>
                            </li>
                            <li class="flex">
                                <span class="w-24 text-gray-500">综合评分：</span>
                                <span class="font-bold ${ruler.total_score >= 0 ? 'text-green-600' : 'text-red-600'}">${ruler.total_score >= 0 ? '+' + ruler.total_score : ruler.total_score}</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
            <div class="md:col-span-2">
                <div class="mb-6">
                    <h4 class="font-semibold text-lg mb-2">详细介绍</h4>
                    <p class="text-gray-600 mb-4">${ruler.basic_info?.achievements || '暂无详细介绍'}</p>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div class="bg-green-50 p-4 rounded-lg">
                            <h5 class="font-semibold text-green-700 mb-2 flex items-center">
                                <i class="fa fa-plus-circle mr-2"></i> 加分项（+${ruler.positive_points?.score || 0}）
                            </h5>
                            <ul class="space-y-2 text-gray-600">
                                ${ruler.positive_points?.items?.map(item => `
                                    <li class="flex">
                                        <span class="text-green-500 mr-2">+${item.score}</span>
                                        <span>${item.title}：${item.description}</span>
                                    </li>
                                `).join('') || '<li class="text-gray-400">无</li>'}
                            </ul>
                        </div>
                        <div class="bg-red-50 p-4 rounded-lg">
                            <h5 class="font-semibold text-red-700 mb-2 flex items-center">
                                <i class="fa fa-minus-circle mr-2"></i> 扣分项（${ruler.negative_points?.score || 0}）
                            </h5>
                            <ul class="space-y-2 text-gray-600">
                                ${ruler.negative_points?.items?.map(item => `
                                    <li class="flex">
                                        <span class="text-red-500 mr-2">${item.score}</span>
                                        <span>${item.title}：${item.description}</span>
                                    </li>
                                `).join('') || '<li class="text-gray-400">无</li>'}
                            </ul>
                        </div>
                    </div>
                </div>

                <div class="mb-6">
                    <h4 class="font-semibold text-lg mb-2">历史意义</h4>
                    <ul class="space-y-2 text-gray-600">
                        ${ruler.historical_significance?.map(point => `
                            <li class="flex items-start">
                                <i class="fa fa-check-circle text-primary mt-1 mr-2"></i>
                                <span>${point}</span>
                            </li>
                        `).join('') || '<li class="text-gray-400">无</li>'}
                    </ul>
                </div>

                <div>
                    <h4 class="font-semibold text-lg mb-2">综合评价</h4>
                    <p class="text-gray-600 mb-2">总体：${ruler.evaluation?.overall || '暂无评价'}</p>
                    <p class="text-gray-600">历史遗产：${ruler.evaluation?.legacy || '暂无评价'}</p>
                </div>
            </div>
        </div>
    `;

    // 显示模态框
    detailModal.classList.remove('hidden');
}

// 更新对比图表和表格
function updateComparisonCharts() {
    // 筛选数据
    let filteredRulers = [...rulersData];

    if (currentFilter !== 'all') {
        if (currentFilter === 'high-score') {
            filteredRulers = filteredRulers.filter(ruler => ruler.total_score >= 20);
        } else if (currentFilter === 'low-score') {
            filteredRulers = filteredRulers.filter(ruler => ruler.total_score <= 0);
        } else {
            filteredRulers = filteredRulers.filter(ruler => ruler.category.includes(currentFilter));
        }
    }

    // 更新图表
    updateScoreChart(filteredRulers);

    // 更新表格
    renderComparisonTable(filteredRulers);
}

// 渲染对比表格
function renderComparisonTable(rulers) {
    const tableBody = document.querySelector('#comparison-table tbody');
    tableBody.innerHTML = '';

    if (rulers.length === 0) {
                   tableBody.innerHTML = `
                       <tr>
                           <td colspan="7" class="py-8 text-center text-gray-500">没有符合条件的数据</td>
                       </tr>
                   `;
                   return;
               }

               // 按总分排序
               const sortedRulers = [...rulers].sort((a, b) => b.total_score - a.total_score);

               sortedRulers.forEach(ruler => {
                   const row = document.createElement('tr');
                   row.className = 'border-b border-gray-100 hover:bg-gray-50 transition-colors';

                   // 确定评分颜色
                   let scoreColor = 'text-primary';
                   if (ruler.total_score < 0) {
                       scoreColor = 'text-red-600';
                   } else if (ruler.total_score < 20) {
                       scoreColor = 'text-green-600';
                   }

                   row.innerHTML = `
                       <td class="py-3 px-4 font-medium">${ruler.name}</td>
                       <td class="py-3 px-4">${ruler.dynasty}</td>
                       <td class="py-3 px-4">${ruler.reign_period}</td>
                       <td class="py-3 px-4">${ruler.positive_points?.items?.map(item => item.title).join('；') || '无'}</td>
                       <td class="py-3 px-4">${ruler.negative_points?.items?.map(item => item.title).join('；') || '无'}</td>
                       <td class="py-3 px-4 font-bold ${scoreColor}">${ruler.total_score >= 0 ? '+' + ruler.total_score : ruler.total_score}</td>
                       <td class="py-3 px-4">${ruler.evaluation?.legacy || '暂无评价'}</td>
                   `;

                   tableBody.appendChild(row);
               });
           }

           // 更新评分图表
           function updateScoreChart(rulers) {
               const ctx = document.getElementById('scoreChart').getContext('2d');

               // 如果图表已存在，销毁它
               if (scoreChart) {
                   scoreChart.destroy();
               }

               if (rulers.length === 0) {
                   // 清空画布
                   ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
                   // 绘制提示信息
                   ctx.fillStyle = '#64748B';
                   ctx.font = '16px Inter, sans-serif';
                   ctx.textAlign = 'center';
                   ctx.fillText('没有符合条件的数据', ctx.canvas.width / 2, ctx.canvas.height / 2);
                   return;
               }

               // 按总分排序
               const sortedRulers = [...rulers].sort((a, b) => b.total_score - a.total_score);

               // 准备图表数据
               const labels = sortedRulers.map(ruler => ruler.name);
               const scores = sortedRulers.map(ruler => ruler.total_score);

               // 设置颜色
               const backgroundColors = scores.map(score => {
                   if (score >= 20) {
                       return 'rgba(79, 70, 229, 0.2)';
                   } else if (score >= 0) {
                       return 'rgba(52, 211, 153, 0.2)';
                   } else {
                       return 'rgba(239, 68, 68, 0.2)';
                   }
               });

               const borderColors = scores.map(score => {
                   if (score >= 20) {
                       return 'rgba(79, 70, 229, 1)';
                   } else if (score >= 0) {
                       return 'rgba(52, 211, 153, 1)';
                   } else {
                       return 'rgba(239, 68, 68, 1)';
                   }
               });

               // 绘制评分图表
               scoreChart = new Chart(ctx, {
                   type: 'bar',
                   data: {
                       labels: labels,
                       datasets: [{
                           label: '综合评分',
                           data: scores,
                           backgroundColor: backgroundColors,
                           borderColor: borderColors,
                           borderWidth: 1
                       }]
                   },
                   options: {
                       responsive: true,
                       maintainAspectRatio: false,
                       scales: {
                           y: {
                               beginAtZero: false,
                               title: {
                                   display: true,
                                   text: '综合评分'
                               }
                           },
                           x: {
                               title: {
                                   display: true,
                                   text: '掌权者'
                               }
                           }
                       },
                       plugins: {
                           legend: {
                               display: false
                           },
                           tooltip: {
                               callbacks: {
                                   label: function(context) {
                                       const score = context.raw;
                                       return `评分: ${score >= 0 ? '+' + score : score}`;
                                   }
                               }
                           }
                       }
                   }
               });
           }

           // 添加滚动监听
           function addScrollListener() {
               const navbar = document.getElementById('navbar');

               window.addEventListener('scroll', () => {
                   if (window.scrollY > 50) {
                       navbar.classList.add('py-2');
                       navbar.classList.remove('py-3');
                       navbar.classList.add('shadow-xl');
                   } else {
                       navbar.classList.add('py-3');
                       navbar.classList.remove('py-2');
                       navbar.classList.remove('shadow-xl');
                   }
               });
           }

           // 页面加载完成后加载数据
           document.addEventListener('DOMContentLoaded', loadRulersData);
// 筛选器固定功能
    function setupStickyFilters() {
        const navbar = document.getElementById('navbar');
        const filters = document.getElementById('filters');
        const placeholder = document.getElementById('filters-placeholder');

        if (!navbar || !filters || !placeholder) return;

        // 页面加载时和窗口大小改变时更新导航栏高度
        function updateNavbarHeight() {
            const navbarHeight = navbar.offsetHeight;
            filters.style.setProperty('--navbar-height', `${navbarHeight}px`);
        }

        updateNavbarHeight();
        window.addEventListener('resize', updateNavbarHeight);

        // 计算筛选器距离顶部的位置
        const filtersTop = filters.getBoundingClientRect().top + window.pageYOffset;

        // 滚动事件处理
        window.addEventListener('scroll', () => {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const navbarHeight = navbar.offsetHeight;

            if (scrollTop > filtersTop - navbarHeight) {
                // 滚动到筛选器下方，固定筛选器
                filters.classList.add('fixed-filters');
                filters.style.top = `${navbarHeight}px`; // 动态设置top值
                placeholder.style.display = 'block';
            } else {
                // 回到筛选器原始位置，取消固定
                filters.classList.remove('fixed-filters');
                filters.style.top = '0';
                placeholder.style.display = 'none';
            }
        });
    }

    // 页面加载完成后初始化筛选器固定功能
    document.addEventListener('DOMContentLoaded', setupStickyFilters);