var image = ee.Image("projects/ee-1261423515/assets/WUHOU/2021-Amplitude"),
    image2 = ee.Image("projects/ee-1261423515/assets/WUHOU/2021-Basevalue"),
    image4 = ee.Image("projects/ee-1261423515/assets/WUHOU/2021-End-of-season-value"),
    image5 = ee.Image("projects/ee-1261423515/assets/WUHOU/2021-Large-integral"),
    image6 = ee.Image("projects/ee-1261423515/assets/WUHOU/2021-Left-derivative"),
    image8 = ee.Image("projects/ee-1261423515/assets/WUHOU/2021-Maximm-value-of-fitted-data"),
    image9 = ee.Image("projects/ee-1261423515/assets/WUHOU/2021-Right-derivative"),
    image10 = ee.Image("projects/ee-1261423515/assets/WUHOU/2021-Smal1-integral"),
    image12 = ee.Image("projects/ee-1261423515/assets/WUHOU/2021-Start-of-season-value"),
    srtm = ee.Image("USGS/SRTMGL1_003"),
    table = ee.FeatureCollection("projects/ee-1261423515/assets/EHEWet/shidi_EHE"),
    table2 = ee.FeatureCollection("projects/ee-1261423515/assets/EHEWet/qita_EHE"),
    table3 = ee.FeatureCollection("projects/ee-1261423515/assets/EHEWet/shuiti_EHE"),
    s2_DSWE = ee.Image("projects/ee-1261423515/assets/EHEWet/2021_EHE_s2_DSWE"),
    roi = ee.FeatureCollection("projects/ee-1261423515/assets/EHE");

/**************************添加训练样本***************************************************/ 
// 定义可视化参数
var visualizationParams = { 
  color: 'FF0000', // 红色
  pointRadius: 2
};

// 在地图上添加图层
// Map.addLayer(table, visualizationParams, 'Sample Points');
// Map.addLayer(table2, visualizationParams, 'Flood Training Data');
Map.addLayer(roi, {color: 'grey'}, 'Region of Interest');

// 设置地图的中心和缩放级别
Map.centerObject(roi, 5);

// 定义setFeaturePro函数  
//1:湿地
function setFeaturePro(Feature) {
  return Feature.set({'Landcover': 1});
}
// 使用map函数将setFeaturePro函数应用于table中的每个特征
var updatedTable = table.map(setFeaturePro);
// 使用map函数将setFeaturePro函数应用于table2中的每个特征
// var updatedTable2 = table6.map(setFeaturePro);
var updatedTable2 = updatedTable;
//2:其他
function setFeaturePro2(Feature) {
  return Feature.set({'Landcover': 2});
}
var other = table2.map(setFeaturePro2);
//3:水体
function setFeaturePro3(Feature) {
  return Feature.set({'Landcover': 3});
}
var water = table3.map(setFeaturePro3);

// 使用merge函数将两个更新后的FeatureCollection合并为一个新的FeatureCollection
var combinedTrainingSet = updatedTable.merge(updatedTable2).merge(other).merge(water);

// Export.table.toDrive({
//   collection: combinedTrainingSet,
//   description: 'combinedTrainingSet',
//   folder: 'GEE_Exports', // 保存到 Google Drive 中的文件夹名称
//   fileFormat: 'CSV' // 导出的文件格式，可以是 CSV、JSON、KML 等
// });


// 打印合并后的FeatureCollection
print(combinedTrainingSet.first(),"combinedTrainingSet");
// Map.addLayer(combinedTrainingSet, visualizationParams, 'combinedTrainingSet');
// 定义可视化参数
var visualizationParams1 = {
  color: 'FF0000', // 红色，代表湿地 (Landcover: 1)
  pointRadius: 2
};

var visualizationParams2 = {
  color: '00FF00', // 绿色，代表其他 (Landcover: 2)
  pointRadius: 2
};

var visualizationParams3 = {
  color: '0000FF', // 蓝色，代表水体 (Landcover: 3)
  pointRadius: 2
};

// 在地图上添加图层
Map.addLayer(combinedTrainingSet.filter(ee.Filter.eq('Landcover', 1)), visualizationParams1, 'Wetland (Landcover: 1)');
Map.addLayer(combinedTrainingSet.filter(ee.Filter.eq('Landcover', 2)), visualizationParams2, 'Other (Landcover: 2)');
Map.addLayer(combinedTrainingSet.filter(ee.Filter.eq('Landcover', 3)), visualizationParams3, 'Water (Landcover: 3)');

/**************************哨兵12影像***************************************************/ 
var district = roi;
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
var s2_masked = sentinel2.median().clip(district_geometry)
                   
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
  
  // MNDWI calculation
  var MNDWI = image.normalizedDifference(['B3', 'B11']).rename('MNDWI');
  
  // TCWGD（Tasseled Cap Wetness Greenness Difference）calculation
  var TCW = image.expression(
    '(0.1511*BLUE)+(0.1973*GREEN)+(0.3283*RED)+(0.3407*NIR)+(-0.7117*SWIR1)+(-0.4559*SWIR2)',{
      'BLUE': image.select('B2'),
      'GREEN': image.select('B3'),
      'RED': image.select('B4'),
      'NIR': image.select('B8'),
      'SWIR1': image.select('B11'),
      'SWIR2': image.select('B12')
    })
  var TCG = image.expression(
      '(-0.2941*BLUE)+(-0.243*GREEN)+(-0.5424*RED)+(0.7276*NIR)+(0.0713*SWIR1)+(-0.1608*SWIR2)',{
        'BLUE': image.select('B2'),
        'GREEN': image.select('B3'),
        'RED': image.select('B4'),
        'NIR': image.select('B8'),
        'SWIR1': image.select('B11'),
        'SWIR2': image.select('B12')
      })
  var TCWGD = TCW.subtract(TCG).rename('TCWGD');
  
  
  
  
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
  return image.addBands([NDWI, NDVI, MSAVI2, EVI, SAVI, MTVI, WI, MSI, NDBI, NDMI, MNDWI, TCWGD]);
};

composite = addIndices(composite);

// print('composite',composite);
// Map.addLayer(composite, {
//   bands: ['B4', 'B3', 'B2'], // Choose the RGB bands for visualization
//   min: 0,
//   max: 0.3, // Adjust the min and max values based on your data range
//   gamma: 1.4 // Adjust the gamma value for better visualization
// }, 'Composite Image');




/**************************DSWE***************************************************/ 
// // Function to calculate and add DSWE
// var addDSWE = function(imag, dem){
//   // define function to add index as band to each image in collection
//   var addNDVI = function(imag) {
//     var ndvi = imag.normalizedDifference(['B8', 'B4']).rename('NDVI')
//     return imag.addBands(ndvi);
//   };
//   var addMNDWI = function(imag){
//     var mndwi = imag.normalizedDifference(['B3','B11']).rename('MNDWI')
//     return imag.addBands(mndwi);
//   };
//   var addMBSRV = function(imag){
//     var mbsrv = imag.select('B3').add(imag.select('B4')).rename('MBSRV')
//     return imag.addBands(mbsrv);
//   };
//   var addMBSRN = function(imag){
//     var mbsrn= imag.select('B8').add(imag.select('B11')).rename('MBSRN')
//     return imag.addBands(mbsrn);
//   };
//   var addAWESH = function(imag) {
//   var awesh = (imag
//     .expression('Blue + (2.5 * Green) - (1.5 * mbsrn) - (0.25 * Swir2)', {
//       'Blue': imag.select(['B2']),
//       'Green': imag.select(['B3']),
//       'mbsrn': addMBSRN(imag).select(['MBSRN']),
//       'Swir2': imag.select(['B12']) })
//       .rename('AWESH')
//       );
//     return imag.addBands(awesh);
//   };
  
//   //apply index functions to image collection
//   var dswe_indices = imag.map(addNDVI)
//                           .map(addMNDWI)
//                           .map(addMBSRV)
//                           .map(addMBSRN)
//                           .map(addAWESH);
  
//   //calculate mean composite for each band
//   //output stack containing only the indices/bands needed for dswe
//   var dswe_inputs = dswe_indices.mean()
//                                 .select(['MNDWI','MBSRV','MBSRN',
//                                         'AWESH','NDVI','B2',
//                                         'B8','B11','B12']);
                                         
//   // define variables 
//   var mndwi = dswe_inputs.select('MNDWI'),
//       mbsrv = dswe_inputs.select('MBSRV'),
//       mbsrn = dswe_inputs.select('MBSRN'),
//       awesh = dswe_inputs.select('AWESH'),
//       ndvi = dswe_inputs.select('NDVI'),
//       swir1 = dswe_inputs.select('B11'),
//       nir = dswe_inputs.select('B8'),
//       blue = dswe_inputs.select('B2'),
//       swir2 = dswe_inputs.select('B12'),
//       slope = ee.Terrain.slope(dem),
//       hillshade = ee.Terrain.hillshade(dem); 
  
//   // define thresholds for each test
//   var t1_thresh = mndwi.gt(0.124).rename('Test_1');
//   var t2_thresh = mbsrv.gt(mbsrn).rename('Test_2');
//   var t3_thresh = awesh.gt(0).rename('Test_3');
//   var t4_thresh = mndwi.gt(-0.44)
//                       .and(swir1.lt(900))
//                       .and(nir.lt(1500))
//                       .and(ndvi.lt(0.7))
//                       .rename('Test_4');
//   var t5_thresh = mndwi.gt(-0.5)
//                       .and(blue.lt(1000))
//                       .and(swir1.lt(3000))
//                       .and(swir2.lt(1000))
//                       .and(nir.lt(2500))
//                       .rename('Test_5');
  
//   //multiply booleans from test thresholds and add to create pixel values
//   var tests = t1_thresh                        //test 1 true = 1
//               .add(t2_thresh.multiply(10))     //test 2 true = 10
//               .add(t3_thresh.multiply(100))    //test 3 true = 100
//               .add(t4_thresh.multiply(1000))   //test 4 true = 1000
//               .add(t5_thresh.multiply(10000))  //test 5 true = 10000
//               .rename('DSWE_Tests');           //rename result 
  
//   //apply decision rules to classify pixel in 5 classes
//   var rules = tests.remap(
//     /**first list - pixel values in test image, 
//     * second list: new values for dswe output in following order:
//       * 1: no water
//       * 2: water-high
//       * 3: water-moderate
//       * 4: potential wetland
//       * 5: water-low
//     */
//     [0, 1, 10, 100, 1000, 
//     1111, 10111, 11011, 11101, 11110, 11111, 
//     111, 1011, 1101, 1110, 10011, 10101, 10110, 11001, 11010, 11100, 
//     11000,
//     11, 101, 110, 1001, 1010, 1100, 10000, 10001, 10010, 10100], 
//     [1, 1, 1, 1, 1, 
//     2, 2, 2, 2, 2, 2, 
//     3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 
//     4, 
//     5, 5, 5, 5, 5, 5, 5, 5, 5, 5], 
//     0)
//     .rename('DSWE_Rules');
     
//   //post-processing of image to apply hillshade/slope thresholds
//   /**reclassifies to 1 (not water) if (in same order as coded):
//       * water-high and slope >=30
//       * water-moderate and slope >= 30
//       * potential wetland and slope >= 20
//       * water-low and slope >= 10
//       * anywhere hillshade <= 110
//   */
//   var dswe =
//   rules.where(slope.gte(30).and(rules.eq(2)), 1)
//   rules.where(slope.gte(30).and(rules.eq(3)), 1)
//   rules.where(slope.gte(20).and(rules.eq(4)), 1)
//   rules.where(slope.gte(10).and(rules.eq(5)), 1)
//   rules.where(hillshade.lte(110), 1);
  
//   return(dswe.rename('DSWE'));
// };

// var s2_DSWE = addDSWE(s2_masked, srtm).float();

composite = composite.addBands(s2_DSWE).clip(roi);

// print('composite',composite);
// Map.addLayer(composite, {
//   bands: ['B4', 'B3', 'B2'], // Choose the RGB bands for visualization
//   min: 0,
//   max: 0.3, // Adjust the min and max values based on your data range
//   gamma: 1.4 // Adjust the gamma value for better visualization
// }, 'Composite Image');


/**************************纹理特征***************************************************/ 
// print(s2_masked)
var sentinelImage = s2_masked
// 计算灰度图像
var gray = sentinelImage.expression(
  '(0.3 * NIR) + (0.59 * R) + (0.11 * G)', {
    'NIR': sentinelImage.select('B8'), // 使用哨兵-2的近红外波段
    'R': sentinelImage.select('B4'),  // 使用哨兵-2的红色波段
    'G': sentinelImage.select('B3')   // 使用哨兵-2的绿色波段 
}).rename('gray');

// 计算GLCM
var glcm = gray.unitScale(0, 0.30) // 对灰度图像进行单位缩放，范围从0到0.30
               .multiply(100)         // 将值放大到合适的范围
               .toInt()               // 转换为整数
               .glcmTexture({
                 size: 1,              // GLCM窗口大小
                 kernel: null          // 使用默认的卷积核
               });

// 打印GLCM
print('GLCM', glcm);
// var nir = s2_masked.select('B8').toUint16() 
// var glcm = nir.glcmTexture({size: 4});
// print(glcm,'glcm')　　　//灰度共生矩阵
var contrast = glcm.select('gray_contrast');  //CON (Contrast)对比度
var asm = glcm.select('gray_asm');            //ASM (Angular Second Moment)角秒矩
var corr = glcm.select('gray_corr');          //CORR (Correlation)相关性
var varr = glcm.select('gray_var');           //VAR (Variance)方差
var idm = glcm.select('gray_idm');            //IDM (Inverse Difference Moment)反向差分力矩
var diss = glcm.select('gray_diss');          //DISS (Dissimilarity)差异
var sent = glcm.select('gray_sent');          //SENT(Sum Entropy)熵总和  
var ent = glcm.select('gray_ent');            //ENT (Entropy)熵
Map.addLayer(contrast,
             {min: 0, max: 1500, palette: ['0000CC','CC0000']},
             'contrast');
var data2 = ee.Image.cat([contrast],[asm],[corr],[varr],[idm]
,[diss],[sent],[ent]).clip(roi) 



/**************************面向对象***************************************************/ 
//设置种子
var seeds = ee.Algorithms.Image.Segmentation.seedGrid(20);
// print('seeds',seeds);
//生成一个网格状的种子点，数字20表示网格的大小。这意味着图像将被划分为一个20x20的网格，每个网格的中心将作为一个种子点，用于启动分割算法的过程。
//利用 SNIC 进行分割，得到对象。参数的设置根据自己的需求来
var snic = ee.Algorithms.Image.Segmentation.SNIC({
  // image: composite.select(['NDVI','NDWI','EVI']), 
  image: composite, 
  size: 32,  //定义了每个超像素的初始大小。超像素是分割的基本单元，这里的大小是32x32像素
  compactness: 5,  //控制了超像素的形状。较小的值会导致更规则的形状，而较大的值可能导致更不规则的形状。
  connectivity: 8,  //定义了像素之间的连接性。这表示每个像素与其8个相邻像素相连接。
  neighborhoodSize:256,  //定义了相邻超像素的最大大小，这是一个控制超像素大小的参数。
  seeds: seeds
})
//clusters就是分割得到的一个个对象
var clusters = snic.select('clusters') //band of cluster IDs
Map.addLayer(clusters.randomVisualizer(), {}, 'clusters')
Map.addLayer(snic, {img: ['B4', 'B5', 'B6'], min:0, max:1, gamma: 0.8}, 'SNIC_means') //per-cluster averages for each of the input bands
 
//计算每个对象的 stdDev.样本标准偏差
var stdDev = composite.addBands(clusters).reduceConnectedComponents(ee.Reducer.stdDev(), 'clusters', 256)
  .select([
    'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B8A', 'B11', 'B12', 
    'VV', 'VH', 'NDWI', 'NDVI', 'MSAVI2', 'EVI', 'SAVI', 'MTVI', 'WI', 
    'MSI', 'NDBI', 'NDMI', 'MNDWI', 'TCWGD', 'DSWE'
  ], [
    'B2_stdDev', 'B3_stdDev', 'B4_stdDev', 'B5_stdDev', 'B6_stdDev', 
    'B7_stdDev', 'B8_stdDev', 'B8A_stdDev', 'B11_stdDev', 'B12_stdDev', 
    'VV_stdDev', 'VH_stdDev', 'NDWI_stdDev', 'NDVI_stdDev', 'MSAVI2_stdDev', 
    'EVI_stdDev', 'SAVI_stdDev', 'MTVI_stdDev', 'WI_stdDev', 'MSI_stdDev', 
    'NDBI_stdDev', 'NDMI_stdDev', 'MNDWI_stdDev', 'TCWGD_stdDev', 'DSWE_stdDev'
  ]);

var area = ee.Image.pixelArea().addBands(clusters).reduceConnectedComponents(ee.Reducer.sum(), 'clusters', 256).rename('SNIC_area')
// Map.addLayer(area, {min:5000, max: 50000}, 'Cluster Area', false)
 
var minMax = clusters.reduceNeighborhood(ee.Reducer.minMax(), ee.Kernel.square(1));
var perimeterPixels = minMax.select(0).neq(minMax.select(1)).rename('SNIC_perimeter');
// Map.addLayer(perimeterPixels, {min: 0, max: 1}, 'perimeterPixels');
 
var perimeter = perimeterPixels.addBands(clusters)
    .reduceConnectedComponents(ee.Reducer.sum(), 'clusters', 256);
// Map.addLayer(perimeter, {min: 100, max: 400}, 'Perimeter size', false);
 
var sizes = ee.Image.pixelLonLat().addBands(clusters).reduceConnectedComponents(ee.Reducer.minMax(), 'clusters', 256)
var width = sizes.select('longitude_max').subtract(sizes.select('longitude_min')).rename('SNIC_width')
var height = sizes.select('latitude_max').subtract(sizes.select('latitude_min')).rename('SNIC_height')
// Map.addLayer(width, {min:0, max:0.02}, 'Cluster width', false)
// Map.addLayer(height, {min:0, max:0.02}, 'Cluster height', false)

//分类器参数设置，选择分类依据：包括了area，width等
var objectPropertiesImage = ee.Image.cat([
  snic,
  stdDev,  //标准偏差
  area,
  perimeter, //周长
  width,
  height
]).float();


var data=ee.Image.cat([composite,objectPropertiesImage,
data2,
image.rename(['Ampl']),image2.rename(['Base_val']),image4.rename(['End_val']),
image5.rename(['L_integral']),image6.rename(['L_deriv']),image8.rename(['Peak_val']),
image9.rename(['R_deriv']),image10.rename(['S_integral']),image12.rename(['Start_val'])
]).float().clip(roi);
print(data,'data')    // 合并样本点
Map.addLayer(data, visualizationParams, 'data');

// Export.image.toDrive({
//   image: data,
//   description: '2021data_RF',
//   scale: 10,
//   region: roi,
//   folder: 'EHE_2021datar_RF',
//   crs:'EPSG:4326',
//   maxPixels:1e13,
//   formatOptions: {
//         cloudOptimized: true
//   }
// });

/**************************机器学习***************************************************/ 
// 添加随机数字段
var sampleData = combinedTrainingSet.filterBounds(roi).randomColumn('random');
// 随机拆分样本点为训练样本和验证样本
var sample_training = sampleData.filter(ee.Filter.lte("random", 0.8))
var sample_validate  = sampleData.filter(ee.Filter.gt("random", 0.8))

// 利用样本点拾取特征值用于模型训练和验证
var training = data.sampleRegions({
  collection: sample_training, 
  properties: ["Landcover"], 
  scale:10,
  tileScale: 16
});
var validation = data.sampleRegions({
  collection: sample_validate, 
  properties: ["Landcover"], 
  scale:10,
  tileScale:16
}); 

Export.table.toDrive({
  collection: training,
  description: 'training_samples',
  folder: 'GEE_Exports', // 保存到 Google Drive 中的文件夹名称
  fileFormat: 'CSV' // 导出的文件格式，可以是 CSV、JSON、KML 等
});

Export.table.toDrive({
  collection: validation,
  description: 'validation_samples',
  folder: 'GEE_Exports', // 保存到 Google Drive 中的文件夹名称
  fileFormat: 'CSV' // 导出的文件格式，可以是 CSV、JSON、KML 等
});




//分类方法选择随机森林
var rf = ee.Classifier.smileRandomForest({
  numberOfTrees: 100,  //一般来说，随机森林模型中的决策树数量越多，模型的性能越好，但同时训练时间也会增加。
  bagFraction: 0.8
}).train({
  features: training,
  classProperty: 'Landcover',
  inputProperties: data.bandNames()
});
//对哨兵数据进行随机森林分类
var classifier_RF = data.classify(rf); 
var dict = ee.Dictionary(rf.explain().get('importance'));


// 计算特征重要性
var dict = rf.explain().get('importance');
// print('Feature Importance:', dict);
// 将字典对象转换为特征集合
var featureCollection = ee.FeatureCollection(
  ee.Feature(null, dict)
);

// 导出特征集合为 CSV 文件
Export.table.toDrive({
  collection: featureCollection,
  description: 'Feature_Importance',
  fileFormat: 'CSV'
});







//验证数据集合调用classify进行验证分析得到分类验证结果
var validated = validation.classify(rf);
//验证结果的混淆矩阵
var testAccuracy = validated.errorMatrix("Landcover","classification");

// 导出混淆矩阵
Export.table.toDrive({
  collection: ee.FeatureCollection([ee.Feature(null, {
    // confusionMatrix: testAccuracy,
    // confusionMatrix: ee.List(testAccuracy.array()).flatten(),
    confusionMatrix: ee.Array(testAccuracy.array()).toList(),
    accuracy: testAccuracy.accuracy(),
    kappa: testAccuracy.kappa(),
    producersAccuracy: testAccuracy.producersAccuracy(),
    consumersAccuracy: testAccuracy.consumersAccuracy(),
    order: testAccuracy.order()
  })]),
  description: '2021RF_HunXiao',
  fileFormat: 'CSV'
});

// print('confusionMatrix',testAccuracy);
// print('overall accuracy', testAccuracy.accuracy());
// print('kappa accuracy', testAccuracy.kappa());
// print('PA', testAccuracy.producersAccuracy());
// print('UA',testAccuracy.consumersAccuracy());
// print('Order',testAccuracy.order());
 

/**************************导出结果***************************************************/ 
Export.image.toDrive({
  image: classifier_RF,
  description: '2021classifier_RF',
  scale: 10,
  region: roi,
  folder: 'EHE_2021classifier_RF',
  crs:'EPSG:4326',
  maxPixels:1e13,
  formatOptions: {
        cloudOptimized: true
  }
});







