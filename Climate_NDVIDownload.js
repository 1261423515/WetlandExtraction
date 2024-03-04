// 修改1：把roi换成table
var table = ee.FeatureCollection("projects/ee-1261423515/assets/EHE");

// 修改2：把sentinel换成modis
var modis = ee.ImageCollection("MODIS/006/MOD13Q1");

// 修改3：把imageVisParam2换成适合Modis的参数
var imageVisParam2 = {"opacity":1,"bands":["sur_refl_b01","sur_refl_b04","sur_refl_b03"],"min":0,"max":5000,"gamma":1};

// 修改4：把imageVisParam换成适合Modis的参数
var imageVisParam = {"opacity":1,"bands":["NDVI"],"min":0,"max":10000,"gamma":1};

Map.addLayer(table)

Map.centerObject(table,5)

//计算NDVI函数

var NDVI_pre=function (collection){

var fun_Cloud = function(image) {

// 修改5：把NDVI的计算公式换成适合Modis的
var NDVI=image.normalizedDifference(['sur_refl_b02', 'sur_refl_b01']).rename('NDVI')

return image.addBands(NDVI).clip(table);

};

collection = ee.ImageCollection(collection)

.map(fun_Cloud)

;

// 修改6：把最大值镶嵌换成中值镶嵌
var img1 = collection.reduce(ee.Reducer.median())

return img1.select("NDVI_median")

}

//主函数

var get_NDVI_image=function(file_name,date_start, date_end){

var collection =modis

.filterDate(date_start, date_end)//时间筛选

.filterBounds(table) //地点筛选

// 修改7：去掉云量过滤和排序，因为Modis已经去过云了

var NDVI_IMAGE_each_month=NDVI_pre(collection)

var vis = {min: 0, max: 10000, palette: [

'FFFFFF', 'CE7E45', 'FCD163', '66A000', '207401',

'056201', '004C00', '023B01', '012E01', '011301'

]};

Map.addLayer(NDVI_IMAGE_each_month,vis)

//加载处理结果影像·

// Map.addLayer(collection,imageVisParam2)

Export.image.toDrive({

image: NDVI_IMAGE_each_month,

description: file_name,//文件名

folder: file_name,

// 修改8：把分辨率换成250米，因为Modis的NDVI是250米的
scale: 250,//分辨率

region: table,//区域

maxPixels:1e13//此处值设置大一些，防止溢出

});

}

//哨兵2A影像是从2017年开始有全球的.获取哪一年的，写哪一年

for(var i=2021;i<2022;i++){

//1-12月份循环

for(var j=1;j<13;j++){

var file_name=i+"year_"+j+"month";

//规则化时间

var date_start=ee.Date.fromYMD(i, j, 1)

//时间间隔函数，做几个月的合成写几。这里我做一个月的中值合成

var date_end=date_start.advance(1,"month");

//代入到NDVI的计算函数中

get_NDVI_image(file_name,date_start,date_end)

}

}
