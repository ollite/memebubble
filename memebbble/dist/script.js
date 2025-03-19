console.log("Script started");

// 动态设置 SVG 尺寸
const container = document.querySelector(".container");
const svg = d3.select("svg");
const width = container.clientWidth;
const height = container.clientHeight;
svg.attr("width", width).attr("height", height);
const g = svg.append("g");

console.log("SVG dimensions:", width, height);

if (typeof d3 === "undefined") {
  console.error("D3.js is not loaded!");
} else {
  console.log("D3.js loaded successfully");
}

// 调整力模拟参数，实现宇宙漂浮效果
const simulation = d3.forceSimulation()
  .force("x", d3.forceX(width / 2).strength(0.01))
  .force("y", d3.forceY(height / 2).strength(0.01))
  .force("collide", d3.forceCollide(d => d.radius + 15).strength(1))
  .force("charge", d3.forceManyBody().strength(-30))
  .alphaDecay(0.002)
  .alphaMin(0.05);

// 添加自定义力，增强漂浮效果
const driftForce = (alpha) => {
  return (nodes) => {
    nodes.forEach(node => {
      node.vx += (Math.random() - 0.5) * 1.5 * alpha;
      node.vy += (Math.random() - 0.5) * 1.5 * alpha;
    });
  };
};
simulation.force("drift", driftForce);

function updateLastUpdated() {
  const now = new Date();
  const lastUpdatedElement = document.getElementById("last-updated");
  if (lastUpdatedElement) {
    lastUpdatedElement.textContent = now.toLocaleString();
  } else {
    console.warn("Last updated element not found");
  }
}

function updateActiveButton(timeframe) {
  document.querySelectorAll(".timeframe-btn").forEach(btn => {
    btn.classList.remove("active");
    if (btn.getAttribute("data-timeframe") === timeframe) {
      btn.classList.add("active");
    }
  });
}

function showError(message) {
  const errorElement = document.getElementById("error-message");
  if (errorElement) {
    errorElement.textContent = message;
    errorElement.style.display = "block";
    setTimeout(() => {
      errorElement.style.display = "none";
    }, 5000);
  }
}

// 数据缓存
let cachedData = null;
const CACHE_KEY = "memeBubbleData";
const CACHE_DURATION = 5 * 60 * 1000;

function saveToCache(data) {
  const timestamp = Date.now();
  localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp }));
  cachedData = data;
}

function getFromCache() {
  const cached = localStorage.getItem(CACHE_KEY);
  if (cached) {
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp < CACHE_DURATION) {
      cachedData = data;
      return data;
    }
  }
  return null;
}

// 防抖函数
let isFetching = false;
function debounceFetch(fn, delay) {
  let timeout;
  return (...args) => {
    if (isFetching) return;
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      fn(...args);
    }, delay);
  };
}

function updateData() {
  console.log("updateData called");
  if (isFetching) {
    console.log("Already fetching, skipping...");
    return;
  }

  const activeButton = document.querySelector(".timeframe-btn.active");
  const timeframe = activeButton ? activeButton.getAttribute("data-timeframe") : "1h";
  console.log("Timeframe:", timeframe);

  const corsProxy = "https://cors-anywhere.herokuapp.com/";
  const apiUrl = "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&category=meme-token&order=market_cap_desc&per_page=15&page=1";
  const url = corsProxy + apiUrl;

  console.log("Fetching data from:", url);

  isFetching = true;
  fetch(url)
    .then(response => {
      console.log("Response status:", response.status);
      if (!response.ok) {
        throw new Error("API request failed with status: " + response.status + " - " + response.statusText);
      }
      return response.json();
    })
    .then(data => {
      console.log("API Response:", data);
      saveToCache(data);
      processData(data, timeframe);
    })
    .catch(error => {
      console.error("Detailed Error:", error.message, error.stack);
      if (error.message.includes("429")) {
        showError("Too many requests to the API. Using cached data...");
        const cached = getFromCache();
        if (cached) {
          processData(cached, timeframe);
        } else {
          showError("No cached data available. Please try again later.");
          const mockData = [
            {
              id: "dogecoin",
              market_cap: 1000000000,
              current_price: 0.1,
              price_change_percentage_1h_in_currency: 5,
              price_change_percentage_4h_in_currency: 3,
              price_change_percentage_24h: 2,
              symbol: "doge",
              image: "https://assets.coingecko.com/coins/images/1/small/dogecoin.png"
            },
            {
              id: "shiba-inu",
              market_cap: 500000000,
              current_price: 0.00001,
              price_change_percentage_1h_in_currency: -2,
              price_change_percentage_4h_in_currency: -1,
              price_change_percentage_24h: -3,
              symbol: "shib",
              image: "https://assets.coingecko.com/coins/images/11939/small/shiba.png"
            }
          ];
          processData(mockData, timeframe);
        }
      } else {
        showError("Failed to load data: " + error.message);
        const mockData = [
          {
            id: "dogecoin",
            market_cap: 1000000000,
            current_price: 0.1,
            price_change_percentage_1h_in_currency: 5,
            price_change_percentage_4h_in_currency: 3,
            price_change_percentage_24h: 2,
            symbol: "doge",
            image: "https://assets.coingecko.com/coins/images/1/small/dogecoin.png"
          },
          {
            id: "shiba-inu",
            market_cap: 500000000,
            current_price: 0.00001,
            price_change_percentage_1h_in_currency: -2,
            price_change_percentage_4h_in_currency: -1,
            price_change_percentage_24h: -3,
            symbol: "shib",
            image: "https://assets.coingecko.com/coins/images/11939/small/shiba.png"
          }
        ];
        processData(mockData, timeframe);
      }
    })
    .finally(() => {
      isFetching = false;
    });
}

function processData(data, timeframe) {
  console.log("processData called with data:", data);
  if (!data || !Array.isArray(data)) {
    throw new Error("Invalid data: Data is not an array");
  }

  const filteredData = data.slice(0, 15);
  console.log("Filtered Data:", filteredData);

  if (!filteredData || filteredData.length === 0) {
    throw new Error("No coins found in the data");
  }

  const minRadius = 40;
  const nodes = filteredData.map(d => {
    if (!d.id) {
      console.warn("Missing id for coin:", d);
      return null;
    }
    const baseRadius = d.market_cap ? Math.sqrt(d.market_cap) / 4000 : minRadius;
    return {
      id: d.id,
      radius: Math.max(minRadius, baseRadius),
      value: d.current_price || 0,
      change: timeframe === "1h" ? (d.price_change_percentage_1h_in_currency || d.price_change_percentage_24h || 0) :
              timeframe === "4h" ? (d.price_change_percentage_4h_in_currency || d.price_change_percentage_24h || 0) :
              (d.price_change_percentage_24h || 0),
      symbol: d.symbol ? d.symbol.toUpperCase() : "UNKNOWN",
      image: d.image || "https://via.placeholder.com/32",
      marketCap: d.market_cap || 0,
      x: width / 2 + (Math.random() - 0.5) * 100,
      y: height / 2 + (Math.random() - 0.5) * 100,
      isHovered: false // 添加悬停标志
    };
  }).filter(d => d !== null);

  console.log("Nodes:", nodes);

  if (nodes.length === 0) {
    throw new Error("No valid nodes after mapping");
  }

  const bubbles = g.selectAll(".bubble")
    .data(nodes, d => d.id);

  bubbles.exit().transition().duration(500).attr("opacity", 0).remove();

  const enter = bubbles.enter()
    .append("g")
    .attr("class", "bubble")
    .attr("opacity", 0);

  enter.append("circle")
    .attr("class", "outer-ring")
    .attr("r", d => d.radius);

  enter.append("image")
    .attr("xlink:href", d => d.image)
    .attr("width", d => Math.min(d.radius * 0.6, 32))
    .attr("height", d => Math.min(d.radius * 0.6, 32))
    .attr("x", d => -Math.min(d.radius * 0.3, 16))
    .attr("y", d => -Math.min(d.radius * 0.5, 24));

  enter.append("text")
    .attr("class", "change")
    .attr("dy", d => d.radius * 0.4)
    .text(d => (d.change > 0 ? "+" : "") + d.change.toFixed(1) + "%")
    .attr("fill", d => d.change > 0 ? "#10b981" : "#ef4444")
    .attr("font-size", d => Math.min(d.radius * 0.4, 14));

  const allBubbles = enter.merge(bubbles);

  allBubbles.transition().duration(500).attr("opacity", 1);

  // 存储当前力模拟的节点
  let activeNodes = [...nodes];
  simulation.nodes(activeNodes).on("tick", () => {
    allBubbles.each(function(d) {
      // 更新位置
      const x = Math.max(d.radius, Math.min(width - d.radius, d.x));
      const y = Math.max(d.radius, Math.min(height - d.radius, d.y));
      d3.select(this).attr("transform", `translate(${x},${y})`);
    });
  });

  simulation.alpha(1).restart();

  allBubbles.on("mouseover", function(event, d) {
    console.log("Mouseover on:", d.id);
    // 标记为悬停
    d.isHovered = true;
    // 保存当前位置
    d.fixedX = d.x;
    d.fixedY = d.y;
    // 从力模拟中移除该节点
    activeNodes = activeNodes.filter(node => node.id !== d.id);
    simulation.nodes(activeNodes);
    simulation.alpha(1).restart();
    // 固定位置
    d3.select(this).attr("transform", `translate(${d.fixedX},${d.fixedY})`);
    // 显示工具提示
    const tooltip = d3.select("#tooltip");
    const price = d.value != null ? d.value.toFixed(2) : "N/A";
    const change = d.change != null ? d.change.toFixed(2) : "N/A";
    const marketCap = d.marketCap != null ? d.marketCap.toLocaleString() : "N/A";
    const timeframeUpper = timeframe ? timeframe.toUpperCase() : "N/A";
    tooltip
      .classed("show", true)
      .html(`
        <img src="${d.image}" alt="${d.id}">
        <strong>Name:</strong> ${d.id}<br>
        <strong>Symbol:</strong> ${d.symbol}<br>
        <strong>Price:</strong> $${price}<br>
        <strong>${timeframeUpper} Change:</strong> ${change}%<br>
        <strong>Market Cap:</strong> $${marketCap}
      `);
    const tooltipNode = tooltip.node();
    const tooltipRect = tooltipNode.getBoundingClientRect();
    let left = event.pageX + 20;
    let top = event.pageY - 50;
    if (left + tooltipRect.width > window.innerWidth) {
      left = event.pageX - tooltipRect.width - 20;
    }
    if (top < 0) {
      top = event.pageY + 20;
    }
    tooltip.style("left", left + "px").style("top", top + "px");
  });

  allBubbles.on("mouseout", function(event, d) {
    console.log("Mouseout");
    // 取消悬停状态
    d.isHovered = false;
    // 重新加入力模拟
    if (!activeNodes.find(node => node.id === d.id)) {
      activeNodes.push(d);
    }
    simulation.nodes(activeNodes);
    simulation.alpha(0.1).restart(); // 平滑恢复
    // 隐藏工具提示
    d3.select("#tooltip").classed("show", false);
  });

  allBubbles.on("click", function(event, d) {
    console.log("Clicked on:", d.id);
    window.location.href = `chart.html?coin=${d.id}`;
  });

  updateLastUpdated();
}

const debouncedUpdateData = debounceFetch(updateData, 1000);

document.querySelectorAll(".timeframe-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const timeframe = btn.getAttribute("data-timeframe");
    updateActiveButton(timeframe);
    debouncedUpdateData();
  });
});

const cached = getFromCache();
if (cached) {
  const activeButton = document.querySelector(".timeframe-btn.active");
  const timeframe = activeButton ? activeButton.getAttribute("data-timeframe") : "1h";
  processData(cached, timeframe);
} else {
  debouncedUpdateData();
}

setInterval(debouncedUpdateData, 120000);

window.addEventListener("resize", () => {
  const newWidth = container.clientWidth;
  const newHeight = container.clientHeight;
  svg.attr("width", newWidth).attr("height", newHeight);
  simulation.force("x", d3.forceX(newWidth / 2).strength(0.01))
    .force("y", d3.forceY(newHeight / 2).strength(0.01));
  simulation.alpha(1).restart();
});