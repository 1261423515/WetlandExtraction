//// ********************************************************************//// 
// The script was developed to map the wetland hydrological dynamics of    //
// the Irtysh River basin using Sentinel II imagery and depression data.   //
// The methods used include: k-means clustering, Otsu thresholding, DEM    //
// depression analysis, object-based image analysis,overlay analysis,etc.  //
// Author: Kaiyue Luo                                                      //
//// ********************************************************************//// 

//由于冬季影像对于地物分类作用不大，且包含冰雪等对水体的影像，故不考虑冬季。
//而是将代码中的冬季时间改为5-9月生长季节时间
 
 

/**************************加载模块***************************************************/ 
var utils = require('users/1261423515/wetlandModules:utils');
var datasets = require('users/1261423515/wetlandModules:datasets');
var mapping = require('users/1261423515/wetlandModules:mapping');
// print(utils.message + datasets.message + mapping.message); //测试调用是否成功


/**************************导入数据***************************************************/ 
// 研究区 
var Case_Area = ee.FeatureCollection("projects/ee-1261423515/assets/EHE");
Map.centerObject(Case_Area, 5);// 添加图层到地图
Map.addLayer(ee.Image().paint(Case_Area, 0, 2), {palette: ['green']}, 'Case Area');
// 引用全球30米分辨率Copernicus DEM数据产品（COPDEM/GLO30）
var COPDEM = ee.ImageCollection("COPERNICUS/DEM/GLO30").filterBounds(Case_Area).mosaic().clip(Case_Area);
// print('COPDEM',COPDEM);
// Map.addLayer(COPDEM,{color:"0000ff"}, 'COPDEM');
// 选择 DEM 数据的一个波段
var dem = COPDEM.select('DEM'); // 替换 'DEM' 为实际的 DEM 波段名称
// 使用凹陷算法（吴秋生）得到的sink洼地 ,使用的是COPDEM
var Sink = ee.Image("projects/ee-1261423515/assets/EHE_ras_sink_bin");
print('Sink',Sink);
Map.addLayer(Sink, {palette: ['blue']}, 'Sink');
// 创建像素面积图像
var pixelArea = ee.Image.pixelArea();
// 计算sink数据的总面积(m²)
var sinkArea = Sink.multiply(pixelArea).reduceRegion({
  reducer: ee.Reducer.sum(),
  maxPixels: 1e13,
  tileScale: 4,
  scale: 30 
});
var sinkAreakm = ee.Number(sinkArea.get('b1')).divide(1e6);
// 使用getInfo方法将数字对象转换为一个数字，并使用toFixed方法将数字转换为一个字符串，并保留两位小数
var sinkAreakmStr = sinkAreakm.getInfo().toFixed(2);
// 打印结果
print('Sink洼地总面积(km²)：', sinkAreakmStr);
// //随机选择一块区域用于小范围可视化结果
// var Smallarea = 
//     /* color: #d63000 */
//     /* displayProperties: [
//       {
//         "type": "rectangle"
//       }
//     ] */
//     ee.Geometry.Polygon(
//         [[[79.76553094788882, 53.009961341359194],
//           [79.76553094788882, 52.95208322506898],
//           [79.88088739320132, 52.95208322506898],
//           [79.88088739320132, 53.009961341359194]]], null, true);


/**************************代码中用到的自定义参数***************************************************/ 
// 自定义参数
var scale = 2;          // 计算统计数据的图像比例尺（分辨率）
var min_dep_size = 100; // 最小漏斗/湿地大小（以像素为单位）
var nclusters = 5;      // k-means聚类的簇数
//我们对JRC全球水发生产品应用了90%的阈值，以获得“永久水”掩膜(见图5b)。如果一个地点在1984年至2015年间经常(≥90%)被检测到有水，我们可以合理地假设，在我们的研究期间(2009-2017年)，它很有可能仍然是水。我们进行了叠加分析，以提取位于该“永久水”掩模内的无监督分类像素。基于提取的分类图像子集，我们确定哪些聚类是代表水的优势类。由于提取的子集图像可能包含一些错误分类的像素，因此使用10%的阈值来消除少数聚类。换句话说，如果一个簇占JRC“永久水”掩模提取的图像总面积的< 10%，则该簇被淘汰。利用优势聚类的值从NAIP无监督分类结果中提取像素，这些像素代表NAIP图像衍生的潜在水域。
var permanent_threshold = 75;     // 从JRC Global Water Occurrence提取永久水的阈值（%）         //根据效果调整阈值
var cluster_threshold = 0.05;      // 聚类中的水域必须占总像素的百分比大于此值，才能被分类为水域；永久性水域内的群组必须超过 x% 的像素，才能被归类为水域
var years = [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023]; // 研究区域可用的sentinel2图像年份
var num_years = years.length;                     // 可用sentinel2图像年份数量


/**************************水产品，得到JRC永久性水体 ***************************************************/ 
// 在 GEE 地理空间数据目录中获取可用的地表水产品
var GLCF_Water = ee.ImageCollection('GLCF/GLS_WATER').mosaic().clip(Case_Area).eq(2);// GLCF: Landsat Global Inland Water (2000)
GLCF_Water = GLCF_Water.updateMask(GLCF_Water); 
// 计算GLCF水体数据的面积，并格式化为字符串
var GLCF_Water_Area = ee.Number.parse(utils.imgAreaHa(GLCF_Water, Case_Area,100).get('water'));
// 格式化输出结果
var formattedArea = ee.Algorithms.If({
  condition: GLCF_Water_Area,
  trueCase: GLCF_Water_Area.format('%,.2f'),
  falseCase: 'No data'
});
// Map.addLayer(GLCF_Water, {palette: ['blue']}, 'GLCF Water');// 在地图上显示 GLCF_Water
// print('GLCF Water Area:', GLCF_Water_Area);// 打印 GLCF_Water_Area 的结果，区域像素数量太大，超出了 maxPixels 的限制
var JRC_Water = ee.Image("JRC/GSW1_4/GlobalSurfaceWater").clip(Case_Area);// JRC Global Surface Water Mapping Layers (1984-03-16T00:00:00Z–2022-01-01T00:00:00)
var JRC_Water_Max_Extent = JRC_Water.select('max_extent');     // 选择水体的最大范围（频率图层，表示水体出现的频率）
 // 计算JRC最大范围水体数据的面积，并格式化为字符串
var JRC_Water_Max_Area = ee.Number.parse(utils.imgAreaHa(JRC_Water_Max_Extent,Case_Area, 100).get('max_extent')).format('%,.2f');
var JRC_Water_Occurrence = JRC_Water.select('occurrence');    // 选择水体出现的二进制图层，其中1表示水体曾经被检测到
var JRC_Permanent_Water = JRC_Water_Occurrence.gt(permanent_threshold);  // 根据阈值判断是否为永久性水体
//可视化
Map.addLayer(JRC_Permanent_Water, {min: 0, max: 1, palette: ['white', 'red']}, 'JRC_Permanent_Water');


/**************************四季的哨兵影像***************************************************/ 
//去云处理 
// function maskS2clouds(image) {
//   var qa = image.select('QA60');
//   // 第10和11位分别是云和卷云。位移运算去云
//   var cloudBitMask = 1 << 10;
//   var cirrusBitMask = 1 << 11;
//   // 这两个标志都应设为零，表示条件明确。
//   var mask = qa.bitwiseAnd(cloudBitMask).eq(0)
//       .and(qa.bitwiseAnd(cirrusBitMask).eq(0));
//   return image.updateMask(mask).divide(10000);
// }
// 获取带有NDWI和NDVI波段的四季 Sentinel-2 影像
// 通过基于指定区域（Case_Area）、日期范围和云覆盖（小于20%）来过滤Sentinel-2图像，创建一个图像集（sentinel2）
var sentinel2 = ee.ImageCollection("COPERNICUS/S2")
  .filterBounds(Case_Area)
  .filterDate('2016-01-01', '2017-01-01')                             //时间根据实际情况修改
  // .map(maskS2clouds)
  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20));
// print(sentinel2);

// 春夏秋冬四个季节的时间范围
var spring = ee.Filter.date('2016-03-01', '2016-05-31');
var summer = ee.Filter.date('2016-06-01', '2016-08-31');
var autumn = ee.Filter.date('2016-09-01', '2016-11-30');
var winter = ee.Filter.date('2016-05-01', '2016-09-01');
// 通过为每个季节过滤sentinel2集合，然后计算中位数值，选择了每个季节的单一图像
var springImage = sentinel2.filter(spring).median().clip(Case_Area);
var summerImage = sentinel2.filter(summer).median().clip(Case_Area);
var autumnImage = sentinel2.filter(autumn).median().clip(Case_Area);
var winterImage = sentinel2.filter(winter).median().clip(Case_Area);
// 计算并添加 NDWI 和 NDVI 作为新的波段
var addIndices = function(image) {
  var NDWI = image.normalizedDifference(['B3', 'B8']).rename('NDWI');
  var NDVI = image.normalizedDifference(['B8', 'B4']).rename('NDVI');
  return image.addBands(NDWI).addBands(NDVI);
};
springImage = addIndices(springImage);
summerImage = addIndices(summerImage);
autumnImage = addIndices(autumnImage);
winterImage = addIndices(winterImage);
// 在地图上可视化
Map.addLayer(springImage, {bands: ['B4', 'B3', 'B2'], min: 0, max: 3000, gamma: 1.4}, 'Spring');
Map.addLayer(summerImage, {bands: ['B4', 'B3', 'B2'], min: 0, max: 3000, gamma: 1.4}, 'Summer');
Map.addLayer(autumnImage, {bands: ['B4', 'B3', 'B2'], min: 0, max: 3000, gamma: 1.4}, 'Autumn');
Map.addLayer(winterImage, {bands: ['B4', 'B3', 'B2'], min: 0, max: 3000, gamma: 1.4}, 'Winter');
print('Spring Image Properties:', springImage, 'summerImage Properties:', summerImage, 'autumnImage Properties:', autumnImage, 'winterImage Properties:', winterImage );


/**************************验证数据***************************************************/ 
// 全球湿地数据验证产品GWL_FCS30，30米分辨率
var GWL = ee.Image("projects/ee-1261423515/assets/EHE_GWL_FCS30_2020");
// print('GWL', GWL);
// 定义一个颜色列表，其中第一个颜色表示非湿地，第二个颜色表示湿地
var palette = ['black', 'green'];
// 使用remap方法，将图像的像素值映射成0和1，0代表非湿地，1代表湿地
var GWL_binary = GWL.remap([0, 180, 181, 182, 183], [0, 1, 1, 1, 1],1);
// 定义一个标签列表，其中第一个名称表示非湿地，第二个名称表示湿地
var labels = ['Non-wetland', 'Wetland'];
// 使用set方法，为图像添加一个label属性，该属性是标签列表
var GWL_binary_label = GWL_binary.set('label', labels);
// 使用visualize方法，指定min为0，max为1，palette为颜色列表
var GWL_binary_vis = GWL_binary_label.visualize({min: 0, max: 1, palette: palette});
// 在地图上添加图层
Map.addLayer(GWL_binary_vis, {}, 'GWL_binary');
// print('GWL_binary', GWL_binary);
// print('GWL_binary_labe', GWL_binary_label);
// print('GWL_binary_label label', GWL_binary_label.get('label'));
// 使用updateMask方法，将非湿地的像素值设置为null，这样只显示湿地的像素
var GWL_wetland = GWL_binary_label.updateMask(GWL_binary_label.neq(0));
// 使用visualize方法，指定min为1，max为1，palette为颜色列表的第二个元素
var GWL_wetland_vis = GWL_wetland.visualize({min: 1, max: 1, palette: palette[1]});
// 在地图上添加图层
Map.addLayer(GWL_wetland_vis, {}, 'GWL_wetland');
// 定义一个函数，计算湿地区域的汇总统计数据
var computeSummaryStatistics = function(image, label) {
  // 计算带有指定标签的像素数量
  var pixelCount = image.reduceRegion({
    reducer: ee.Reducer.sum(),
    geometry: image.geometry(),
    scale: 30,
    maxPixels: 1e13,
    tileScale: 4
  }).getNumber('remapped');
  // 将像素计数转换为数字
  pixelCount = ee.Number(pixelCount);
  // 计算湿地总面积（单位：km²）
  var area = pixelCount.multiply(900).divide(1e6);
  // 计算湿地平均大小（单位：m²）
  var averageSize = area.divide(pixelCount);
  return ee.List([pixelCount, area, averageSize]);
};
// 调用湿地的函数
var wetlandStats = computeSummaryStatistics(GWL_wetland, 'Wetland');
// 获取NWI湿地数据的摘要统计信息，包括湿地数量、总湿地面积、平均湿地大小
    var GWL_wetland_count = wetlandStats.get(0);
    var GWL_wetland_total = ee.Number(wetlandStats.get(1)).format('%,.2f');
    var GWL_wetland_mean = ee.Number(wetlandStats.get(2)).format('%,.2f');
// print('GWLwetland 湿地像元数量: ', GWL_wetland_count);
// print('GWLwetland 湿地总面积 (km²): ', GWL_wetland_total);
//因为没有总的湿地个数，所以计算这个没有意义，后期需要的话可以用SNIC来计算湿地个数
// print('GWL 平均湿地大小 (m²): ', GWL_wetland_mean); 


/**************************基于直方图的Otsu方法计算最佳 NDWI 临界值***************************************************/ 
// Get spring NDWI image
var springNDWI = springImage.select(['NDWI']);
var springNDWI_mean = ee.ImageCollection(springNDWI).mean();  // 根据所有可用的 SpringImage 图像创建 NDWI 平均图像
var springhist_NDWI = ee.Dictionary(utils.histogram(springNDWI_mean, 'NDWI', Case_Area, scale));  // 绘制 NDWI 直方图
var springthreshold_NDWI = ee.Number.parse(utils.otsu(springhist_NDWI).format('%.4f'));      // 使用Otsu's method 计算最佳 NDWI 临界值 
// print('springNDWI',springNDWI,'springNDWI_mean',springNDWI_mean,'springhist_NDWI',springhist_NDWI,'springthreshold_NDWI',springthreshold_NDWI);
// Get summer NDWI image
var summerNDWI = summerImage.select(['NDWI']);
var summerNDWI_mean = ee.ImageCollection(summerNDWI).mean();
var summerhist_NDWI = ee.Dictionary(utils.histogram(summerNDWI_mean, 'NDWI', Case_Area, scale));
var summerthreshold_NDWI = ee.Number.parse(utils.otsu(summerhist_NDWI).format('%.4f'));
// Get autumn NDWI image
var autumnNDWI = autumnImage.select(['NDWI']);
var autumnNDWI_mean = ee.ImageCollection(autumnNDWI).mean();
var autumnhist_NDWI = ee.Dictionary(utils.histogram(autumnNDWI_mean, 'NDWI', Case_Area, scale));
var autumnthreshold_NDWI = ee.Number.parse(utils.otsu(autumnhist_NDWI).format('%.4f'));
// Get winter NDWI image
var winterNDWI = winterImage.select(['NDWI']);
var winterNDWI_mean = ee.ImageCollection(winterNDWI).mean();
var winterhist_NDWI = ee.Dictionary(utils.histogram(winterNDWI_mean, 'NDWI', Case_Area, scale));
var winterthreshold_NDWI = ee.Number.parse(utils.otsu(winterhist_NDWI).format('%.4f'));


/**************************提取 JRC 月度历史产品***************************************************/ 
//1984-03-16T00:00:00Z–2022-01-01T00:00:00
// 提取JRC月度历史产品
var get_JRC_monthly = function(input, year, month) {
  // 根据输入的年份和月份，创建开始和结束日期
  // 这里的年份要与哨兵影像的年份对应，如果大于等于2021，就写2021
  year = ee.Algorithms.If(year.gte(2021), 2021, year);
  year = ee.Number(year);
  var start = ee.Date.fromYMD(year, month, 1);
  // 将月份加上2
  var end_month = month.add(2);
  var end_year = ee.Algorithms.If(end_month.gt(12), year.add(1), year);
  // 如果是，将年份加上1，月份减去12
  end_month = ee.Algorithms.If(end_month.gt(12), end_month.subtract(12), end_month);
  // 创建结束日期
  var end = ee.Date.fromYMD(end_year, end_month, 28);
  // 创建开始和结束日期（以月为单位，+2 表示取三个月的数据）

  var JRC_monthly_images = ee.ImageCollection("JRC/GSW1_4/MonthlyHistory").filterDate(start, end);
  // 从JRC数据集中获取特定日期范围内的图像集，这里的数据集是"JRC/GSW1_4/MonthlyHistory"，表示月度水体历史数据
  var JRC_monthly = JRC_monthly_images.max().eq(2).clip(Case_Area);
  // 选择在该时间段内水体出现频率最高的图像，提取水体图像并剪裁到感兴趣区域Case_Area
  JRC_monthly = JRC_monthly.updateMask(JRC_monthly);
  // 应用图像遮罩，将非水体区域设置为无效
  return JRC_monthly.set({'system:time_start': start, 'system:time_end': end});
  // 将结果图像的时间属性设置为开始和结束日期
};
// 定义四个季节开始的月份
var spring_month = ee.Number(3); 
var summer_month = ee.Number(6); 
var autumn_month = ee.Number(9); 
var winter_month = ee.Number(5); //实际是5-9月，但这里是5-7月
// 定义四个季节的年份
var fourthyear = ee.Number(2016);                                              //这里的年份要与哨兵影像的年份对应
// 分别为四个季节的影像调用函数，传入影像，年份和月份作为参数
var spring_JRC_monthly_waters = get_JRC_monthly(springImage, fourthyear, spring_month);
var summer_JRC_monthly_waters = get_JRC_monthly(summerImage, fourthyear, summer_month);
var autumn_JRC_monthly_waters = get_JRC_monthly(autumnImage, fourthyear, autumn_month);
var winter_JRC_monthly_waters = get_JRC_monthly(winterImage, fourthyear, winter_month);
print('spring_JRC_monthly_waters',spring_JRC_monthly_waters,'summer_JRC_monthly_waters',summer_JRC_monthly_waters,'autumn_JRC_monthly_waters',autumn_JRC_monthly_waters,'winter_JRC_monthly_waters',winter_JRC_monthly_waters);
// 定义一个颜色列表，用于表示水体
var waterColor = ['blue'];
// 将四个季节的影像添加到地图上，并指定图层的名称和颜色
Map.addLayer(spring_JRC_monthly_waters, {palette: waterColor}, 'Spring monthly waters');
Map.addLayer(summer_JRC_monthly_waters, {palette: waterColor}, 'Summer monthly waters');
Map.addLayer(autumn_JRC_monthly_waters, {palette: waterColor}, 'Autumn monthly waters');
Map.addLayer(winter_JRC_monthly_waters, {palette: waterColor}, 'Winter monthly waters');
var JRC_monthly_waters = ee.ImageCollection([spring_JRC_monthly_waters, summer_JRC_monthly_waters, autumn_JRC_monthly_waters, winter_JRC_monthly_waters]);

/**************************k均值聚类***************************************************/ 
// 定义一个函数，用于使用k均值聚类对图像进行分类
var classifyImage = function(input){
    // 从输入图像中提取用于训练的样本数据
    var training = input.sample({
    region: Case_Area, // 用于提取训练样本的区域
    // scale: scale, // 采样比例
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
var springclusteredImages = classifyImage(springImage);
var summerclusteredImages = classifyImage(summerImage);
var autumnclusteredImages = classifyImage(autumnImage);
var winterclusteredImages = classifyImage(winterImage);



// // 导出图像
// Export.image.toDrive({
//     image: springclusteredImages,
//     description: 'spring_clustered_image',  // 导出图像的描述
//     scale: 10,  // 图像的比例
//     region: Case_Area,  // 图像的导出区域
//     fileFormat: 'GeoTIFF',  // 导出文件的格式
//     folder: 'EE_Images',  // 导出文件保存的文件夹
//     maxPixels: 1e13  // 允许的最大像素数
// });


// print('springclusteredImages',springclusteredImages,'summerclusteredImages',summerclusteredImages,'autumnclusteredImages',autumnclusteredImages,'winterclusteredImages',winterclusteredImages)
// // 定义一个颜色列表，用于表示不同的聚类簇
// var colors = ['ff0000', '00ff00', '0000ff', 'ffff00', 'ff00ff'];
// // 使用visualize方法生成一个RGB图像，其中palette参数指定了颜色列表
// var springRGB = springclusteredImages.visualize({
//     palette: colors,
//     min: 1,  // 调整显示范围的最小值
//     max: 5   // 调整显示范围的最大值
// });
// // 在地图上显示可视化后的图像
// Map.addLayer(springRGB, {}, 'spring clustered image');




// // 降采样图像以减小数据大小
// var springclusteredImagesDownsampled = springclusteredImages.reduceResolution({
//     reducer: ee.Reducer.median(),
//     maxPixels: 1024
// });
// var summerclusteredImagesDownsampled = summerclusteredImages.reduceResolution({
//     reducer: ee.Reducer.median(),
//     maxPixels: 1024
// });
// var autumnclusteredImagesDownsampled = autumnclusteredImages.reduceResolution({
//     reducer: ee.Reducer.median(),
//     maxPixels: 1024
// });
// var winterclusteredImagesDownsampled = winterclusteredImages.reduceResolution({
//     reducer: ee.Reducer.median(),
//     maxPixels: 1024
// });

// print('springclusteredImages', springclusteredImages);
// print('summerclusteredImages', summerclusteredImages);
// print('autumnclusteredImages', autumnclusteredImages);
// print('winterclusteredImages', winterclusteredImages);

// // 定义一个颜色列表，用于表示不同的聚类簇
// var colors = ['ff0000', '00ff00', '0000ff', 'ffff00', 'ff00ff'];

// // 使用visualize方法生成一个RGB图像，其中palette参数指定了颜色列表
// var springRGB = springclusteredImagesDownsampled.visualize({
//     palette: colors
// });

// // 在地图上显示可视化后的图像
// Map.addLayer(springRGB, {}, 'spring clustered image');


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
        maxPixels: 2.1E9 // 最大像素数
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
var springWaterImages = getWaterCluster(springclusteredImages);
var summerWaterImages = getWaterCluster(summerclusteredImages);
var autumnWaterImages = getWaterCluster(autumnclusteredImages);
var winterWaterImages = getWaterCluster(winterclusteredImages);
JRC_Permanent_Water = JRC_Permanent_Water.updateMask(JRC_Permanent_Water);
// print('springWaterImages',springWaterImages,'summerWaterImages',summerWaterImages,'autumnWaterImages',autumnWaterImages,'winterWaterImages',winterWaterImages);

// function clipCollection(image,geometry){
//   var mask = ee.Image.constant(1).clip(geometry).mask();
//   return image.updateMask(mask);
// }
// var clippedImg = clipCollection(springWaterImages, Smallarea);
// // 导出图像
// Export.image.toDrive({
//     // image: springWaterImages.clip(Smallarea),
//     image: clippedImg,
//     description: 'SmallspringWaterImages',  // 导出图像的描述
//     scale: 10000,  // 图像的比例
//     region: Smallarea,  // 图像的导出区域
//     fileFormat: 'GeoTIFF',  // 导出文件的格式
//     folder: 'Water_EE_Images',  // 导出文件保存的文件夹
//     maxPixels: 1e13  // 允许的最大像素数
// });


// // 定义一个调色板，用于显示水体聚类 
// var wpalette = ['000000', '0000FF'];
// 添加图层到地图上，使用调色板和最小值和最大值 
// Map.addLayer(springWaterImages, {min: -1, max: 1, palette: palette}, 'Spring Water Cluster');


/**************************提取位于Sink洼地内的水体像素***************************************************/ 
    // 定义一个函数，用于提取位于DEM洼地内的水体像素
    var getWaterWithinDep = function(input){
    // 判断像素是否同时等于1且DEM洼地像素值大于0
    var output = input.eq(1).and(Sink.eq(1));
    // 更新掩膜以保留筛选后的水体像素
    output = output.updateMask(output);
    return output;
    };
// 将函数应用于位于DEM洼地内的水体图像
var springrefinedWaterImages = getWaterWithinDep(springWaterImages);
var summerrefinedWaterImages = getWaterWithinDep(summerWaterImages);
var autumnrefinedWaterImages = getWaterWithinDep(autumnWaterImages);
var winterrefinedWaterImages = getWaterWithinDep(winterWaterImages);


/**************************区分小对象和大对象***************************************************/ 
    // 定义一个函数，用于区分小对象和大对象
    var regionGroup = function(input){
        // 获取每个连通区域的像素数量
        var patch_size = input.connectedPixelCount(min_dep_size, true);
        // 检查哪些区域的像素数量大于或等于指定的最小洼地大小
        var large_patches = patch_size.gte(min_dep_size);
        // 更新掩膜，仅保留大区域
        large_patches = large_patches.updateMask(large_patches);
        return large_patches;
    };


/**************************添加时间***************************************************/ 
var springreregionImages = springrefinedWaterImages;
var summerreregionImages = summerrefinedWaterImages;
var autumnreregionImages = autumnrefinedWaterImages;
var winterreregionImages = winterrefinedWaterImages;
//添加时间
var addDate = function(input, dateImage) {
  var start_index = dateImage.get('system:time_start');
  var end_index = dateImage.get('system:time_end');
  return input.set({'system:time_start': start_index, 'system:time_end': end_index});
};
springreregionImages = addDate(springreregionImages,spring_JRC_monthly_waters);
summerreregionImages = addDate(summerreregionImages,summer_JRC_monthly_waters);
autumnreregionImages = addDate(autumnreregionImages,autumn_JRC_monthly_waters);
winterreregionImages = addDate(winterreregionImages,winter_JRC_monthly_waters);


/**************************水体图像***************************************************/ 
// // 计算水体的出现情况，即任何时候检测到水体的位置
// //Occurrence 图像可以用来表示在 regionImages 列表中的图像中，每个像素位置出现的频率或存在性。
// 将季节性图像合并为一个图像集合
var seasonalImages = ee.ImageCollection([springreregionImages, summerreregionImages, autumnreregionImages, winterreregionImages]);
// 对图像集合中每个像素的值求和
var Occurrence = seasonalImages.sum();

 // 将水体图像转换为矢量并存储到列表中
// 定义一个新的函数，将单一影像转换为矢量表示
var rasterToVectorSingle = function(image) {
  // 使用 reduceToVectors 函数将单一影像转换为矢量表示
  var fc = image.reduceToVectors({scale: 5, bestEffort: true, maxPixels: 1e10});
  
  // 计算每个要素的面积并将其添加到属性中
  fc = fc.map(function (feat) {
    return feat.set('area', feat.area(1));
  });

  return fc;
};

// 将每个季节的影像转换为矢量表示
var vectorSpring = rasterToVectorSingle(springreregionImages);
var vectorSummer = rasterToVectorSingle(summerreregionImages);
var vectorAutumn = rasterToVectorSingle(autumnreregionImages);
var vectorWinter = rasterToVectorSingle(winterreregionImages);


/**************************导出结果***************************************************/ 
// // 导出结果
// Export.image.toDrive({
//   image: springreregionImages,
//   description: '2016spring',
//   scale: 10,
//   region: Case_Area,
//   crs:'EPSG:4326',
//   maxPixels:1e13
// });

// Export.image.toDrive({
//   image: summerreregionImages,
//   description: '2016summer',
//   scale: 10,
//   region: Case_Area,
//   crs:'EPSG:4326',
//   maxPixels:1e13
// });

// Export.image.toDrive({
//   image: autumnreregionImages,
//   description: '2016autumn',
//   scale: 10,
//   region: Case_Area,
//   crs:'EPSG:4326',
//   maxPixels:1e13
// });

// Export.image.toDrive({
//   image: winterreregionImages,
//   description: '2016winter',
//   scale: 10,
//   region: Case_Area,
//   crs:'EPSG:4326',
//   maxPixels:1e13
// });


//本研究最终生成的湿地淹没动态图
Export.image.toDrive({
  image: Occurrence.toInt(),
  description: '2016Occurrence',
  scale: 10,
  region: Case_Area,
  crs:'EPSG:4326',
  maxPixels:1e13
});


/**************************统计***************************************************/ 
     // 计算像素面积（单位：公顷）
    var getArea = function(input) {
        var pixelArea = input.multiply(ee.Image.pixelArea()).divide(10000);  // 将像素面积转换为公顷
        var watershedArea = pixelArea.reduceRegions({
        collection: Case_Area,  
        reducer: ee.Reducer.sum(),
        scale: 10
        });
        watershedArea = watershedArea.map(function(fc) {
        var year = ee.Date(input.get('system:time_start')).get('year');  // 从图像的时间信息中提取年份
        var fieldValue = ee.String('Y').cat(ee.String(year));  // 创建一个字段，包含年份信息
        return fc.set('year', fieldValue);
        });
        // watershedArea = watershedArea.map(function(fc) {return fc.set({Y2010ha: fc.get('sum')})});
        watershedArea = watershedArea.select(['name', 'year', 'sum']);  // 选择表格中的相关字段
        return watershedArea;
    };
    
    // 计算 Sentinel 图像水体面积
    var Sentinel_water_areas = seasonalImages.map(getArea);
    Sentinel_water_areas = Sentinel_water_areas.flatten();
    
    // 计算 JRC 月度水体面积
    var JRC_water_areas = JRC_monthly_waters.map(getArea);
    JRC_water_areas = JRC_water_areas.flatten();
 
     // 生成包含 Sentinel  和 JRC 水体面积数据的表格
    var Sentinel_water_table = ee.FeatureCollection(utils.formatTable(Sentinel_water_areas, 'name', 'year'));
    var JRC_water_table = ee.FeatureCollection(utils.formatTable(JRC_water_areas, 'name', 'year'));
    
    // 创建按要素（feature）绘制的水平柱状图
    var chartH = function(table, title) {
        return ui.Chart.feature.byFeature(table, 'name')
        .setChartType('ColumnChart')  // 设置图表类型为柱状图
        .setOptions({
            title: title, // 图表的标题
            hAxis: {title: 'Watershed'}, // X轴标题
            vAxis: {title: 'Inundation Area (ha)'} // Y轴标题
        });
    };
    
    // 创建按要素（feature）和年份（year）绘制的垂直柱状图
    var chartV = function(table, title) {
        return ui.Chart.feature.byFeature(table, 'year', 'sum')
        .setChartType('ColumnChart')  // 设置图表类型为柱状图
        .setOptions({
            title: title, // 图表的标题
            hAxis: {title: 'Year'}, // X轴标题
            vAxis: {title: 'Inundation Area (ha)'} // Y轴标题
        });
    };
 
 
/**************************输出结果***************************************************/ 
// 计算研究区的总面积
var totalArea = Case_Area.geometry().area();
// 输出结果
// print("研究区总面积（平方米）:", totalArea);
// 如果你想将面积转换为其他单位（如平方千米），可以使用除法进行转换
var totalAreaSqKm = totalArea.divide(1e6);
// 格式化输出结果
var formattedTotalArea = ee.Number(totalAreaSqKm).format('%,.2f');
print("研究区总面积 (km²):",formattedTotalArea);

// 计算GLCF Landsat water的总面积
print("GLCF Landsat 水域面积 (2000)(km²):", formattedArea);

//JRC 最大水域范围（1984-2021 年）
print("JRC 最大水域 (1984-2021):(km²):", JRC_Water_Max_Area);

//GWL
print('GWLwetland 湿地像元数量: ', GWL_wetland_count);
print('GWLwetland 湿地总面积 (km²): ', GWL_wetland_total);

//GWL数据生成柱状图以展示不同湿地类型的面积分布情况
print('GWL不同湿地类型的面积分布柱状图见: 5_GWL各类型湿地面积统计');

//使用大津法阈值化四个季节的NDWI
// Print spring NDWI threshold
print('Spring NDWI Threshold:', springthreshold_NDWI);
// Print summer NDWI threshold
print('Summer NDWI Threshold:', summerthreshold_NDWI);
// Print autumn NDWI threshold
print('Autumn NDWI Threshold:', autumnthreshold_NDWI);
// Print winter NDWI threshold
print('Winter NDWI Threshold:', winterthreshold_NDWI);

//显示四个季节的 NDWI 平均值生成的直方图
print('显示四个季节的 NDWI 平均值生成的直方图见: 6_NDWI直方图');

// 计算 JRC_water_areas 并将结果绘制为竖直柱状图表
print('JRC_water_areas 竖直柱状图表见: 7_JRC_water_areas 竖直柱状图表');

// 显示湿地淹没面积和JRC水域面积的统计信息
print('显示湿地淹没面积和JRC水域面积的统计信息见: 8_湿地淹没面积和JRC水域面积图表');

 
