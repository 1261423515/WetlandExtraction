/**************************哨兵12影像***************************************************/ 
// var roi = ee.FeatureCollection("projects/ee-1261423515/assets/Zaysan/ZaysanShp"); 
var district = roi;
var dsize = district.size();
var district_geometry = district.geometry();
var srtm = ee.Image("USGS/SRTMGL1_003");
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
                  .select('B.*')
                  
//裁剪影像
// var composite = sentinel2.median().clip(district_geometry)
var s2_masked = sentinel2

/**************************DSWE***************************************************/ 
// Function to calculate and add DSWE
var addDSWE = function(imag, dem){
  // define function to add index as band to each image in collection
  var addNDVI = function(imag) {
    var ndvi = imag.normalizedDifference(['B8', 'B4']).rename('NDVI')
    return imag.addBands(ndvi);
  };
  var addMNDWI = function(imag){
    var mndwi = imag.normalizedDifference(['B3','B11']).rename('MNDWI')
    return imag.addBands(mndwi);
  };
  var addMBSRV = function(imag){
    var mbsrv = imag.select('B3').add(imag.select('B4')).rename('MBSRV')
    return imag.addBands(mbsrv);
  };
  var addMBSRN = function(imag){
    var mbsrn= imag.select('B8').add(imag.select('B11')).rename('MBSRN')
    return imag.addBands(mbsrn);
  };
  var addAWESH = function(imag) {
  var awesh = (imag
    .expression('Blue + (2.5 * Green) - (1.5 * mbsrn) - (0.25 * Swir2)', {
      'Blue': imag.select(['B2']),
      'Green': imag.select(['B3']),
      'mbsrn': addMBSRN(imag).select(['MBSRN']),
      'Swir2': imag.select(['B12']) })
      .rename('AWESH')
      );
    return imag.addBands(awesh);
  };
  
  //apply index functions to image collection
  var dswe_indices = imag.map(addNDVI)
                          .map(addMNDWI)
                          .map(addMBSRV)
                          .map(addMBSRN)
                          .map(addAWESH);
  
  //calculate mean composite for each band
  //output stack containing only the indices/bands needed for dswe
  var dswe_inputs = dswe_indices.mean()
                                .select(['MNDWI','MBSRV','MBSRN',
                                        'AWESH','NDVI','B2',
                                        'B8','B11','B12']);
                                         
  // define variables 
  var mndwi = dswe_inputs.select('MNDWI'),
      mbsrv = dswe_inputs.select('MBSRV'),
      mbsrn = dswe_inputs.select('MBSRN'),
      awesh = dswe_inputs.select('AWESH'),
      ndvi = dswe_inputs.select('NDVI'),
      swir1 = dswe_inputs.select('B11'),
      nir = dswe_inputs.select('B8'),
      blue = dswe_inputs.select('B2'),
      swir2 = dswe_inputs.select('B12'),
      slope = ee.Terrain.slope(dem),
      hillshade = ee.Terrain.hillshade(dem); 
  
  // define thresholds for each test
  var t1_thresh = mndwi.gt(0.124).rename('Test_1');
  var t2_thresh = mbsrv.gt(mbsrn).rename('Test_2');
  var t3_thresh = awesh.gt(0).rename('Test_3');
  var t4_thresh = mndwi.gt(-0.44)
                      .and(swir1.lt(900))
                      .and(nir.lt(1500))
                      .and(ndvi.lt(0.7))
                      .rename('Test_4');
  var t5_thresh = mndwi.gt(-0.5)
                      .and(blue.lt(1000))
                      .and(swir1.lt(3000))
                      .and(swir2.lt(1000))
                      .and(nir.lt(2500))
                      .rename('Test_5');
  
  //multiply booleans from test thresholds and add to create pixel values
  var tests = t1_thresh                        //test 1 true = 1
              .add(t2_thresh.multiply(10))     //test 2 true = 10
              .add(t3_thresh.multiply(100))    //test 3 true = 100
              .add(t4_thresh.multiply(1000))   //test 4 true = 1000
              .add(t5_thresh.multiply(10000))  //test 5 true = 10000
              .rename('DSWE_Tests');           //rename result 
  
  //apply decision rules to classify pixel in 5 classes
  var rules = tests.remap(
    /**first list - pixel values in test image, 
    * second list: new values for dswe output in following order:
      * 1: no water
      * 2: water-high
      * 3: water-moderate
      * 4: potential wetland
      * 5: water-low
    */
    [0, 1, 10, 100, 1000, 
    1111, 10111, 11011, 11101, 11110, 11111, 
    111, 1011, 1101, 1110, 10011, 10101, 10110, 11001, 11010, 11100, 
    11000,
    11, 101, 110, 1001, 1010, 1100, 10000, 10001, 10010, 10100], 
    [1, 1, 1, 1, 1, 
    2, 2, 2, 2, 2, 2, 
    3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 
    4, 
    5, 5, 5, 5, 5, 5, 5, 5, 5, 5], 
    0)
    .rename('DSWE_Rules');
     
  //post-processing of image to apply hillshade/slope thresholds
  /**reclassifies to 1 (not water) if (in same order as coded):
      * water-high and slope >=30
      * water-moderate and slope >= 30
      * potential wetland and slope >= 20
      * water-low and slope >= 10
      * anywhere hillshade <= 110
  */
  var dswe =
  rules.where(slope.gte(30).and(rules.eq(2)), 1)
  rules.where(slope.gte(30).and(rules.eq(3)), 1)
  rules.where(slope.gte(20).and(rules.eq(4)), 1)
  rules.where(slope.gte(10).and(rules.eq(5)), 1)
  rules.where(hillshade.lte(110), 1);
  
  return(dswe.rename('DSWE'));
};

var s2_DSWE = addDSWE(s2_masked, srtm).float();
print(s2_DSWE);

// 可视化 DSWE
Map.centerObject(roi, 8);
Map.addLayer(s2_DSWE, {min: 1, max: 5, palette: ['white', 'blue', 'cyan', 'green', 'yellow']}, 'DSWE');

// 创建导出任务
Export.image.toAsset({
  image: s2_DSWE,
  description: 's2_DSWE',
  assetId: 'projects/ee-1261423515/assets/EHEWet/2021_EHE_s2_DSWE',
  region: district_geometry,
  scale: 10,  // 适当的分辨率，根据需求调整
  maxPixels: 1e13
});




