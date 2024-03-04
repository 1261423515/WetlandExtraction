var image = ee.Image("projects/ee-1261423515/assets/Zaysan/2021ClusteredImageall"),
    image2 = ee.Image("projects/ee-1261423515/assets/Zaysan/2021WaterImagesall"),
    image3 = ee.Image("projects/ee-1261423515/assets/Zaysan/2021refinedWaterImagesall"),
    Case_Area = ee.FeatureCollection("projects/ee-1261423515/assets/Zaysan/ZaysanShp");

/**************************加载模块***************************************************/ 
var utils = require('users/1261423515/wetlandModules:utils');
var datasets = require('users/1261423515/wetlandModules:datasets');
var mapping = require('users/1261423515/wetlandModules:mapping');
// print(utils.message + datasets.message + mapping.message); //测试调用是否成功


/**************************导入数据***************************************************/ 
// 研究区 
// var Case_Area = ee.FeatureCollection("projects/ee-1261423515/assets/EHE");
Map.centerObject(Case_Area, 8);// 添加图层到地图
Map.addLayer(ee.Image().paint(Case_Area, 0, 2), {palette: ['green']}, 'Case Area');
// 引用全球30米分辨率Copernicus DEM数据产品（COPDEM/GLO30）
var COPDEM = ee.ImageCollection("COPERNICUS/DEM/GLO30").filterBounds(Case_Area).mosaic().clip(Case_Area);
// print('COPDEM',COPDEM);
// Map.addLayer(COPDEM,{color:"0000ff"}, 'COPDEM');
// 选择 DEM 数据的一个波段
var dem = COPDEM.select('DEM'); // 替换 'DEM' 为实际的 DEM 波段名称
// 使用凹陷算法（吴秋生）得到的sink洼地 ,使用的是COPDEM
var Sink = ee.Image("projects/ee-1261423515/assets/EHE_ras_sink_bin");
// 裁剪Sink图像到研究区
Sink = Sink.clip(Case_Area);
// print('Sink',Sink);
Map.addLayer(Sink, {palette: ['blue']}, 'Sink');
// // 创建像素面积图像
// var pixelArea = ee.Image.pixelArea();
// // 计算sink数据的总面积(m²)
// var sinkArea = Sink.multiply(pixelArea).reduceRegion({
//   reducer: ee.Reducer.sum(),
//   maxPixels: 1e13,
//   tileScale: 4,
//   scale: 30 
// });
// var sinkAreakm = ee.Number(sinkArea.get('b1')).divide(1e6);
// // 使用getInfo方法将数字对象转换为一个数字，并使用toFixed方法将数字转换为一个字符串，并保留两位小数
// var sinkAreakmStr = sinkAreakm.getInfo().toFixed(2);          
//定义感兴趣区域（AOI）
var AOI = ee.FeatureCollection("projects/ee-1261423515/assets/EHE"),
    image99 = ee.Image("projects/ee-1261423515/assets/Zaysan/GWL_FCS30_2020");
var roi1 = AOI;
Map.addLayer(roi1, {'color':'grey'},'studyArea',false);
Map.centerObject(roi1, 8);

//GWL_FCS30_2020
var ZaysanLULC = image99.clip(roi1);
// print(ZaysanLULC)
// 定义属性值和相应的颜色
var classColors = {
  0: 'C0C0C0',  // 灰色
  180: '0000FF',  // 蓝色
  181: 'FF0000',  // 红色
  182: 'FFFF00',  // 黄色
  183: 'FF00FF'   // 紫色
};

// 根据属性值创建可视化参数
var visParams = {
  min: 0,
  max: 255,
  palette: Object.keys(classColors).map(function(key) {
    return classColors[key];
  })
};

// 在地图上添加可视化图层
Map.addLayer(ZaysanLULC.select('b1'), visParams, 'Visualized Image');

/**************************代码中用到的自定义参数***************************************************/ 
// 自定义参数
var scale = 2;          // 计算统计数据的图像比例尺（分辨率）
var min_dep_size = 100; // 最小漏斗/湿地大小（以像素为单位）
var nclusters = 5;      // k-means聚类的簇数
var permanent_threshold = 80;     // 从JRC Global Water Occurrence提取永久水的阈值（%）         //根据效果调整阈值
var cluster_threshold = 0.10;      // 聚类中的水域必须占总像素的百分比大于此值，才能被分类为水域
var years = [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023]; // 研究区域可用的sentinel2图像年份
var num_years = years.length;                     // 可用sentinel2图像年份数量


/**************************哨兵12影像***************************************************/ 
var district = Case_Area;
var dsize = district.size();
var district_geometry = district.geometry();
//去云的范围内的范围内，
function maskS2clouds(image) {
  var qa = image.select('QA60');
  // Bits 10 and 11 分别是云和卷云
  var cloudBitMask = 1 << 10;
  var cirrusBitMask = 1 << 11;
  // Both flags should be set to zero, indicating clear conditions.
  var mask = qa.bitwiseAnd(cloudBitMask).eq(0)
      .and(qa.bitwiseAnd(cirrusBitMask).eq(0));
  return image.updateMask(mask).divide(10000);
}

//数据集为Sentinel-2 L2A产品，该产品已经由欧空局预先进行了辐射定标、大气校正等预处理
//Sentinel-2 L2A产品的最早可获取时间为，2017年3月28日
var sentinel2 = ee.ImageCollection("COPERNICUS/S2_SR")
                  .filterBounds(district_geometry)
                  .filterDate('2021-01-01', '2021-12-31')
                  // 选择云量真彩色真彩色，0到到100的范围内
                  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
                  .map(maskS2clouds)
                  // .select('B.*')
                  .select(['B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B8A', 'B11', 'B12']);
                  
//裁剪影像
var composite = sentinel2.median().clip(district_geometry)
                  
//加载S1影像
var s1 = ee.ImageCollection("COPERNICUS/S1_GRD")
//对sentinel1进行筛选
var filtered = s1
                // 滤镜以获得具有VV和VH双偏振的图像。
                .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))//发送器接收器极化
                .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VH'))
                .filter(ee.Filter.eq('instrumentMode', 'IW'))
                // 根据你的位置，将通行证改为ASCENDING
                .filter(ee.Filter.eq('orbitProperties_pass', 'DESCENDING'))
                .filterDate('2021-01-01', '2021-12-31')
                .filterBounds(district_geometry)
                .select('V.')

// 平均值合成sar数据
var sarComposite = filtered.mean()
//让S2影像加载S1的波段
var composite = composite.addBands(sarComposite)                  


/**************************计算并添加指数作为新的波段***************************************************/ 
var addIndices = function(image) {
  // NDWI calculation
  var NDWI = image.normalizedDifference(['B3', 'B8']).rename('NDWI');
  
  // NDVI calculation
  var NDVI = image.normalizedDifference(['B8', 'B4']).rename('NDVI');
  
  // MSAVI-2 calculation
  var MSAVI2 = image.expression(
    '(2 * NIR + 1 - sqrt(pow((2 * NIR + 1), 2) - 8 * (NIR - RED))) / 2',
    {
      'NIR': image.select('B8'),  // Sentinel-2 NIR band
      'RED': image.select('B4')   // Sentinel-2 Red band
    }
  ).rename('MSAVI2');

  // EVI calculation
  var EVI = image.expression(
    '2.5 * ((NIR - RED) / (NIR + 6 * RED - 7.5 * BLUE + 1))',
    {
      'NIR': image.select('B8'),  // Sentinel-2 NIR band
      'RED': image.select('B4'),  // Sentinel-2 Red band
      'BLUE': image.select('B2')  // Sentinel-2 Blue band
    }
  ).rename('EVI');

  // SAVI calculation
  var SAVI = image.expression(
    '((NIR - RED) / (NIR + RED + 0.5)) * 1.5',
    {
      'NIR': image.select('B8'),  // Sentinel-2 NIR band
      'RED': image.select('B4')   // Sentinel-2 Red band
    }
  ).rename('SAVI');

  // MTVI calculation
  var MTVI = image.expression(
    '(1.5 * (1.2 * (NIR - GREEN) - 2.5 * (RED - GREEN))) / sqrt((2 * NIR + 1) + pow((6 * NIR - 5 * sqrt(RED)) - 0.5, 2) + 1.5 * pow(2 * RED - 1.5 * sqrt(GREEN), 2))',
    {
      'NIR': image.select('B8'),    // Sentinel-2 NIR band
      'RED': image.select('B4'),    // Sentinel-2 Red band
      'GREEN': image.select('B3')   // Sentinel-2 Green band
    }
  ).rename('MTVI');

  // Water Index (WI) calculation
  var WI = image.normalizedDifference(['B8', 'B11']).rename('WI');

  // Moisture Stress Index (MSI) calculation
  var MSI = image.expression(
    '(NIR + SWIR - RED) / (NIR + SWIR + RED)',
    {
      'NIR': image.select('B8'),        // Sentinel-2 NIR band
      'SWIR': image.select('B11'),      // Sentinel-2 Short-Wave Infrared band
      'RED': image.select('B4')         // Sentinel-2 Red band
    }
  ).rename('MSI');

  // Normalized Difference Built-up Index (NDBI) calculation
  var NDBI = image.normalizedDifference(['B11', 'B8']).rename('NDBI');

  // Normalized Difference Moisture Index (NDMI) calculation
  var NDMI = image.normalizedDifference(['B8', 'B11']).rename('NDMI');

  // Add all the calculated indices as bands to the image
  return image.addBands([NDWI, NDVI, MSAVI2, EVI, SAVI, MTVI, WI, MSI, NDBI, NDMI]);
};

composite = addIndices(composite);

print('composite',composite);
Map.addLayer(composite, {
  bands: ['B4', 'B3', 'B2'], // Choose the RGB bands for visualization
  min: 0,
  max: 0.3, // Adjust the min and max values based on your data range
  gamma: 1.4 // Adjust the gamma value for better visualization
}, 'Composite Image');


/**************************k均值聚类***************************************************/ 
// 定义一个函数，用于使用k均值聚类对图像进行分类
var classifyImage = function(input){
    // 从输入图像中提取用于训练的样本数据
    var training = input.sample({
        region: Case_Area, // 用于提取训练样本的区域
        scale: 10, // 采样比例
        numPixels: 5000 // 采样的像素数量
    });
    
    // 实例化k均值聚类器并对样本数据进行训练
    var clusterer = ee.Clusterer.wekaKMeans(nclusters).train(training);
        // 使用训练好的聚类器对输入图像进行聚类
    var classifiedImage = input.cluster(clusterer).select('cluster');
        // 返回分类后的图像，其中每个像素都被分配到一个聚类簇
    return classifiedImage;
};
//调用函数对图像集合进行分类
var clusteredImages = classifyImage(composite);

// Map.addLayer(clusteredImages, {
//   min: 0,
//   max: nclusters - 1,  // Adjust the max value based on the number of clusters
//   palette: ['FF0000', '00FF00', '0000FF', 'FFFF00', 'FF00FF']  // Adjust the palette based on the number of clusters
// }, 'Clustered Image');

// // 遍历每个聚类进行可视化
// for (var i = 0; i < nclusters; i++) {
//   var cluster = clusteredImages.eq(i);
//   Map.addLayer(cluster, {palette: 'FF0000'}, 'Cluster ' + i);
// }

// 导出分类结果
var exportOptions = {
  image: clusteredImages,
  description: '2021ClusteredImage',
  assetId: 'projects/ee-1261423515/assets/Zaysan/2021ClusteredImage',
  scale: 10,
  region: Case_Area,
  crs:'EPSG:4326',
  maxPixels:1e13
};
Export.image.toAsset(exportOptions);


/**************************水产品，得到JRC永久性水体 ***************************************************/ 
// 在 GEE 地理空间数据目录中获取可用的地表水产品
var GLCF_Water = ee.ImageCollection('GLCF/GLS_WATER').mosaic().clip(Case_Area).eq(2);// GLCF: Landsat Global Inland Water (2000)
GLCF_Water = GLCF_Water.updateMask(GLCF_Water); 
// 计算GLCF水体数据的面积，并格式化为字符串
var GLCF_Water_Area = ee.Number.parse(utils.imgAreaHa(GLCF_Water, Case_Area,30).get('water')).format('%,.2f');
// Map.addLayer(GLCF_Water, {palette: ['blue']}, 'GLCF Water');// 在地图上显示 GLCF_Water
// print('GLCF Water Area:', GLCF_Water_Area);// 打印 GLCF_Water_Area 的结果，区域像素数量太大，超出了 maxPixels 的限制
var JRC_Water = ee.Image("JRC/GSW1_4/GlobalSurfaceWater").clip(Case_Area);// JRC Global Surface Water Mapping Layers (1984-03-16T00:00:00Z–2022-01-01T00:00:00)
var JRC_Water_Max_Extent = JRC_Water.select('max_extent');     // 选择水体的最大范围（频率图层，表示水体出现的频率）
 // 计算JRC最大范围水体数据的面积，并格式化为字符串
var JRC_Water_Max_Area = ee.Number.parse(utils.imgAreaHa(JRC_Water_Max_Extent,Case_Area, 30).get('max_extent')).format('%,.2f');
var JRC_Water_Occurrence = JRC_Water.select('occurrence');    // 选择水体出现的二进制图层，其中1表示水体曾经被检测到
var JRC_Permanent_Water = JRC_Water_Occurrence.gt(permanent_threshold);  // 根据阈值判断是否为永久性水体

/**************************提取水体聚类***************************************************/ 
//根据永久水体区域的掩膜和聚类簇的频数直方图，筛选出满足阈值要求的水体聚类簇，并将其标记为1，其余的标记为0
// 定义一个函数，用于提取水体聚类
var getWaterCluster = function(input) {
    // 更新输入图像的掩膜以保留永久水体区域
    var clusterImg = input.updateMask(JRC_Permanent_Water);
    
    // 使用减少器计算每个聚类簇的频数直方图
    var frequency = clusterImg.reduceRegion({
        reducer: ee.Reducer.frequencyHistogram(), // 使用频数直方图减少器
        scale: 30, // 分析的比例尺
        maxPixels: 1e13 // 最大像素数
    });
    
    // 从频数直方图中提取聚类簇的键和值
    var dict = ee.Dictionary(frequency.get('cluster'));
    var keys = ee.List(dict.keys()); // 提取键
    var values = ee.List(dict.values()); // 提取值
    
    // 计算阈值以确保每个聚类簇的像素数大于总像素数的一定百分比
    var threshold = ee.Number(values.reduce(ee.Reducer.sum())).multiply(cluster_threshold);
    
    // 创建一个布尔列表，指示哪些聚类簇满足阈值要求
    var clusterList = values.map(function (value) {
        value = ee.Number.parse(value);
        return value.gt(threshold);
    });
    
    // 创建索引列表
    var indexes = ee.List.sequence(0, keys.size().subtract(1));
    
    // 计算满足阈值要求的聚类簇标签
    var clsLabels = indexes.map(function(index) {
        var key = ee.Number.parse(keys.get(index)).add(1);
        var value = clusterList.get(index);
        return key.multiply(value);
    });
    
    // 移除标签为0的项
    clsLabels = clsLabels.removeAll(ee.List([0]));
    
    // 将标签值减1以调整为合适的标签
    clsLabels = clsLabels.map(function(x) {
        return ee.Number(x).subtract(1);
    });
    
    // 重新映射图像的标签，将不满足阈值要求的像素设为-1
    var outList = ee.List.repeat(-1, clsLabels.size());
    clusterImg = input.remap(clsLabels, outList).eq(-1);
    clusterImg = clusterImg.updateMask(clusterImg);
    
    return clusterImg;
};

// 获取在分类后的图像上应用水体聚类
var WaterImages = getWaterCluster(image);
JRC_Permanent_Water = JRC_Permanent_Water.updateMask(JRC_Permanent_Water);
// print('springWaterImages',springWaterImages,'summerWaterImages',summerWaterImages,'autumnWaterImages',autumnWaterImages,'winterWaterImages',winterWaterImages);

// 导出结果
var exportOptions = {
  image: WaterImages,
  description: '2021WaterImages',
  assetId: 'projects/ee-1261423515/assets/Zaysan/2021WaterImages',
  scale: 10,
  region: Case_Area,
  crs:'EPSG:4326',
  maxPixels:1e13
};
Export.image.toAsset(exportOptions);


/**************************提取位于Sink洼地内的水体像素***************************************************/ 
//GWL_FCS30_2020
var ZaysanLULC = ee.Image("projects/ee-1261423515/assets/Zaysan/GWL_FCS30_2020").clip(Case_Area);

// 定义一个函数，用于提取位于DEM洼地内的水体像素
var getWaterWithinDep = function(input){
    // 判断像素是否同时等于1且DEM洼地像素值大于0
    var output = input.eq(1).and(Sink.eq(1)).and(
    ZaysanLULC.select('b1').neq(0).and(ZaysanLULC.select('b1').neq(180))
  );
    // 更新掩膜以保留筛选后的水体像素
    output = output.updateMask(output);
    return output;
    };
var refinedWaterImages = getWaterWithinDep(image2);

// 导出结果
var exportOptions = {
  image: refinedWaterImages,
  description: '2021refinedWaterImages',
  assetId: 'projects/ee-1261423515/assets/Zaysan/2021refinedWaterImages',
  scale: 10,
  region: Case_Area,
  crs:'EPSG:4326',
  maxPixels:1e13
};
Export.image.toAsset(exportOptions);

/**************************提取refinedWaterImages中的随机点***************************************************/ 
var Flood = image3.clip(Case_Area);
Map.addLayer(Flood, {palette: ['orange']}, 'Flood');

var trainingData = Flood.sample({
  region: Case_Area,
  scale: 100,
  numPixels: 320000,  // 根据需要调整抽样点的数量
  seed: 13,          // 设置随机种子以确保可重复性
  geometries: true   // 添加这一行，以确保生成的样本包含几何信息
});

print(trainingData.first());
Map.addLayer(trainingData, {
  color: 'FF0000', 
  pointRadius: 2 
}, 'Training Samples');
print(trainingData.size());


/**************************导出训练点***************************************************/ 
Export.table.toAsset({
  collection: trainingData,
  description:'FloodTrainingData',
  assetId: 'projects/ee-1261423515/assets/Zaysan/2021FloodTrainingData'
});









