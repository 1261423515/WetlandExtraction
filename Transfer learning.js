var image = ee.Image("projects/ee-1261423515/assets/Zaysan/GWL_FCS30_2020"),
    AOI = ee.FeatureCollection("projects/ee-1261423515/assets/EHE");

//定义感兴趣区域（AOI）
var roi = AOI;
Map.addLayer(roi, {'color':'grey'},'studyArea');
Map.centerObject(roi, 5);

//GWL_FCS30_2020
var ZaysanLULC = image.clip(roi);
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

//湿地
var trainingData = ZaysanLULC.updateMask(ZaysanLULC.select('b1').neq(0))
  .updateMask(ZaysanLULC.select('b1').neq(180)).sample({
  region: roi,
  scale: 100,
  numPixels: 250010,   // 根据需要调整抽样点的数量
  seed: 12,          // 设置随机种子以确保可重复性
  geometries: true   // 添加这一行，以确保生成的样本包含几何信息
});
// // //非湿地
// var trainingData = ZaysanLULC.updateMask(ZaysanLULC.select('b1').eq(0))
//   .sample({
//   region: roi,
//   scale: 100,
//   numPixels: 55000,   // 根据需要调整抽样点的数量
//   seed: 11,          // 设置随机种子以确保可重复性
//   geometries: true   // 添加这一行，以确保生成的样本包含几何信息
// });
// // 水体
// var trainingData = ZaysanLULC.updateMask(ZaysanLULC.select('b1').eq(180))
//   .sample({
//   region: roi,
//   scale: 100,
//   numPixels: 500000,  // 根据需要调整抽样点的数量
//   seed: 13,          // 设置随机种子以确保可重复性
//   geometries: true   // 添加这一行，以确保生成的样本包含几何信息
// });


// // 导出为shp文件格式
// Export.table.toDrive({
//   collection: trainingData,
//   description:'trainingData',
//   fileFormat: 'shp'
// });

// // 打印样本数据的示例
// print(trainingData.first());

var labeledData = trainingData.map(function(feature) {
  var label = feature.get('b1');  // Assuming 'b1' is the correct property name
  return feature.set('label', label).setGeometry(feature.geometry());
});


// // 导出为CSV文件格式
// Export.table.toDrive({
//   collection: labeledData,
//   description:'labeledData',
//   fileFormat: 'CSV'
// });
// Print an example of the labeled sample data
// print(labeledData.first());
// print(labeledData);
// Map.addLayer(labeledData, {color: 'FF0000'}, 'Training Samples');
// Map.addLayer(labeledData, {
//   color: 'FF0000', 
//   pointRadius: 2 
// }, 'Training Samples');
// print(labeledData.size());

// 取labeledData的第一个要素
// var firstFeature = labeledData.first();
// 打印该要素的所有属性
// print(firstFeature); 
// 也可以仅打印几何属性
// print(firstFeature.geometry());

// 获取 'b1' 属性中的唯一值及其对应的样本点数量
// var histogramB1 = labeledData.aggregate_histogram('b1');
// print('Histogram of "b1" values:', histogramB1);

// // 将结果可视化为图表
// var chart = ui.Chart.array.values(histogramB1.values(), 0, histogramB1.keys())
//     .setOptions({
//       title: 'Distribution of "b1" values in labeledData',
//       vAxis: {title: 'b1 values'},
//       hAxis: {title: 'Number of points'},
//       legend: 'none'
//     });
// print(chart);





var sampleData = labeledData;
//过滤和显示样本池
var samplePool = sampleData;
// var samplePool = sampleData.filterBounds(roi);
// Map.addLayer(samplePool,null,"samplePool");
// print(samplePool.size());

/**************************************************************************
Define the functions
**************************************************************************/
//用于Landsat 8和Landsat 4、5、7的云去除函数
// reomove cloud for Landsat-8
function rmL8Cloud(image) { 
  var cloudShadowBitMask = (1 << 3); 
  var cloudsBitMask = (1 << 5); 
  var qa = image.select('pixel_qa'); 
  var mask = qa.bitwiseAnd(cloudShadowBitMask).eq(0) 
                .and(qa.bitwiseAnd(cloudsBitMask).eq(0)); 
  var mask2 = image.select("B1").lte(2000);
  return image.updateMask(mask).updateMask(mask2).toFloat().divide(1e4)
              .copyProperties(image)
              .copyProperties(image, ["system:time_start",'system:time_end']);
} 

// remove cloud for Landsat 4, 5 and 7
function rmL457Cloud(image) {
  var qa = image.select('pixel_qa');
  // If the cloud bit (5) is set and the cloud confidence (7) is high
  // or the cloud shadow bit is set (3), then it's a bad pixel.
  var cloud = qa.bitwiseAnd(1 << 5)
                  .and(qa.bitwiseAnd(1 << 7))
                  .or(qa.bitwiseAnd(1 << 3));
  // Remove edge pixels that don't occur in all bands
  var mask2 = image.mask().reduce(ee.Reducer.min());
  
  // remove pixels where the blue reflectance is greater than 0.2
  var mask3 = image.select('B1').gt(2000);
  return image.updateMask(cloud.not()).updateMask(mask2).updateMask(mask3.not()).toFloat().divide(1e4)
              .copyProperties(image)
              .copyProperties(image, ["system:time_start",'system:time_end']);
}

/**************************************************************************
Merge Landsat OLI image
**************************************************************************/
//合并Landsat OLI图像，分别对源（2018年）和目标（2010年）年份
// Assign a common name to the sensor-specific bands.
var LC8_BANDS = ['B2',   'B3',    'B4',  'B5',  'B6',    'B7']; //Landsat 8
var LC7_BANDS = ['B1',   'B2',    'B3',  'B4',  'B5',    'B7']; //Landsat 7
var LC5_BANDS = ['B1',   'B2',    'B3',  'B4',  'B5',    'B7']; //Landsat 5
var STD_NAMES = ['blue', 'green', 'red', 'nir', 'swir1', 'swir2'];

var src_year = 2020;
var src_date_start = 1;
var src_date_end = 12;

var src_l8 = ee.ImageCollection('LANDSAT/LC08/C01/T1_SR')
// var src_l8 = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
               .filterBounds(roi)
               .filter(ee.Filter.calendarRange(src_year, src_year, 'year'))
               .filter(ee.Filter.calendarRange(src_date_start, src_date_end, 'month'))
               .map(rmL8Cloud)
               .select(LC8_BANDS, STD_NAMES)
               .sort("system:time_start"); 

var src_l7 = ee.ImageCollection('LANDSAT/LE07/C01/T1_SR')
// var src_l7 = ee.ImageCollection('LANDSAT/LE07/C02/T1_L2')
               .filterBounds(roi)
               .filter(ee.Filter.calendarRange(src_year, src_year, 'year'))
               .filter(ee.Filter.calendarRange(src_date_start, src_date_end, 'month'))
               .map(rmL457Cloud)
               .select(LC7_BANDS, STD_NAMES)
               .sort("system:time_start");
var src_landsat = ee.ImageCollection(src_l8.merge(src_l7))
                    .sort("system:time_start");
// Map.addLayer(src_landsat,null,'src_landsat',false);     
src_l8 = null;
src_l7 = null;
var srcCol = src_landsat.median().clip(roi);






var target_year = 2023;
var target_date_start = 1;
var target_date_end = 12;


function applyScaleFactorsL89(image) {
  var opticalBands = image.select('SR_B.').multiply(0.0000275).add(-0.2);
  var thermalBands = image.select('ST_B.*').multiply(0.00341802).add(149.0);
  return image.addBands(opticalBands, null, true)
              .addBands(thermalBands, null, true);
}

function applyScaleFactorsL457(image) {
  var opticalBands = image.select('SR_B.').multiply(0.0000275).add(-0.2);
  var thermalBand = image.select('ST_B6').multiply(0.00341802).add(149.0);
  return image.addBands(opticalBands, null, true)
              .addBands(thermalBand, null, true);
}

function cloudmaskL89(image) {
  // Bits 3 and 5 are cloud shadow and cloud, respectively.
  var cloudShadowBitMask = (1 << 4);
  var cloudsBitMask = (1 << 3);
  // Get the pixel QA band.
  var qa = image.select('QA_PIXEL');
  // Both flags should be set to zero, indicating clear conditions.
  var mask = qa.bitwiseAnd(cloudShadowBitMask).eq(0)
                 .and(qa.bitwiseAnd(cloudsBitMask).eq(0));
  return image.updateMask(mask);
}

function cloudMaskL457(image) {
  var qa = image.select('QA_PIXEL');
  // If the cloud bit (5) is set and the cloud confidence (7) is high
  // or the cloud shadow bit is set (3), then it's a bad pixel.
  var cloud = qa.bitwiseAnd(1 << 3)
                  .and(qa.bitwiseAnd(1 << 9))
                  .or(qa.bitwiseAnd(1 << 4));
  // Remove edge pixels that don't occur in all bands
  var mask2 = image.mask().reduce(ee.Reducer.min());
  return image.updateMask(cloud.not()).updateMask(mask2);
}




var LC8_BANDS = ['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'SR_B7']; //Landsat 8
var LC7_BANDS = ['SR_B1', 'SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B7']; //Landsat 7
var LC5_BANDS = ['SR_B1', 'SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B7']; //Landsat 5
var STD_NAMES = ['blue', 'green', 'red', 'nir', 'swir1', 'swir2'];
// var target_l5 = ee.ImageCollection('LANDSAT/LT05/C01/T1_SR')
var target_l5 = ee.ImageCollection('LANDSAT/LT05/C02/T1_L2')
               .filterBounds(roi)
               .filter(ee.Filter.calendarRange(target_year, target_year, 'year'))
               .filter(ee.Filter.calendarRange(target_date_start, target_date_end, 'month'))
              // .map(rmL457Cloud)
               .map(applyScaleFactorsL457)
               .map(cloudMaskL457)
               .select(LC5_BANDS, STD_NAMES)
               .sort("system:time_start"); 

// var target_l7 = ee.ImageCollection('LANDSAT/LE07/C01/T1_SR')
var target_l7 = ee.ImageCollection('LANDSAT/LE07/C02/T1_L2')
               .filterBounds(roi)
               .filter(ee.Filter.calendarRange(target_year, target_year, 'year'))
               .filter(ee.Filter.calendarRange(target_date_start, target_date_end, 'month'))
              // .map(rmL457Cloud)
               .map(applyScaleFactorsL89)
               .map(cloudmaskL89)
               .select(LC7_BANDS, STD_NAMES)
               .sort("system:time_start");
var target_landsat = ee.ImageCollection(target_l5.merge(target_l7))
                    .sort("system:time_start");
// Map.addLayer(target_landsat,null,'target_landsat',false);            
target_l7 = null;
target_l5 = null;                    
var targetCol = target_landsat.median().clip(roi);

// generate the four-season composite
// var targetCol = ee.List.sequence(target_date_start,target_date_end,3).map(function(month){
//   var date_start = ee.Date.fromYMD(target_year,month,1);
//   var date_end = date_start.advance(3, 'month');
//   return target_landsat.filterDate(date_start, date_end).median().clip(roi);
// }).flatten();
// target_landsat = null; 
// var targetCol = ee.ImageCollection.fromImages(targetCol);
// targetCol = targetCol.toBands();
// print("targetCol",targetCol);

//计算光谱距离指标
var sadImg = srcCol.spectralDistance(targetCol, 'sam').cos().unmask(0).clip(roi).rename('sadImg');   //光谱角距离
var edImg = srcCol.spectralDistance(targetCol, 'sed').unmask(0).clip(roi).rename('edImg');   //光谱欧几里得距

var metricImg= sadImg.addBands(edImg).clip(roi);
// print("metricImg",metricImg);
// Map.addLayer(metricImg, null, "metricImg",false);

//对样本区域进行采样并基于指标进行过滤
var samplePoolNew = metricImg.sampleRegions({
  collection: samplePool,
  properties: ['Category'],
  scale: 200,
  tileScale:16,
  geometries: true
});
// print('samplePoolNew',samplePoolNew);

var samplePool_2 = samplePoolNew.filter(ee.Filter.gt("sadImg", 0.4))
                                .filter(ee.Filter.lt("edImg", 0.5));
// print('samplePool_2',samplePool_2.first());
// Map.addLayer(samplePool_2,{'color':'red'},'samplePool_2');
// print(samplePool_2.size());
// print(srcCol)
// print(targetCol)
// // print(samplePoolNew.limit(10));
// print('Sample pool size:', samplePoolNew.size());
// print('Filtered sample pool size:', samplePool_2.size());
// print('samplePoolNew',samplePoolNew.first());
// // 转换样本池大小为字符串
// var samplePoolSize = ee.Number(samplePool_2.size()).format();

// // 创建一个具有样本池大小的特征
// var featureWithSize = ee.Feature(null, {
//   SamplePoolSize: samplePoolSize
// });

// // 创建一个包含单个要素的特征集合
// var featureCollection = ee.FeatureCollection([featureWithSize]);

// // 导出为 CSV 文件
// Export.table.toDrive({
//   collection: featureCollection,
//   description: 'SamplePoolSize',
//   fileFormat: 'CSV'
// });

/**************************导出训练点***************************************************/ 
Export.table.toAsset({
  collection: samplePool_2,
  description:'SamplePointsExport',
  assetId: 'projects/ee-1261423515/assets/Zaysan/2021refinedWaterImages'
});



