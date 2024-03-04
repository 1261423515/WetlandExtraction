# Wetland Extraction and Spatiotemporal Analysis

This repository contains the code implementation for wetland extraction and spatiotemporal analysis based on the proposed method of generating reliable training samples automatically. The overall workflow of this study includes:

1. **Unsupervised Classification for Dynamic Inundation Zone Sample Extraction**: Utilizing unsupervised classification to obtain samples of dynamic inundation zones.
2. **Transfer Learning for Target Year Sample Acquisition**: Employing transfer learning techniques to acquire samples for the target year.
3. **Extraction Algorithm Based on Spectral Indices, Dynamic Surface Water Expansion, Phenological Parameters, Texture Features, and Object-Oriented Analysis**: Developing an extraction algorithm integrating various methods such as spectral indices, dynamic surface water expansion, phenological parameters, texture features, and object-oriented analysis using random forest.
4. **Spatiotemporal Analysis of Wetlands in the E River Basin**: Conducting spatiotemporal analysis of wetlands in the E River Basin.

## Overview

Due to image stitching and cloud cover effects on images in Google Earth Engine (GEE), a significant portion of the images may be obscured, and partial image loss may occur at the seams. Therefore, images obtained from unsupervised classification cannot be directly used for further wetland extraction. However, the wetland portions obtained from this method can be utilized as supervised classification wetland samples. Additionally, wetlands are dynamic in nature, and this study treats wetlands as a land cover type with persistent water bodies (water occurrence frequency ≥ 90%), resulting in a much smaller inundation range compared to actual conditions. Moreover, various conditions such as water superimposition and topographic depression are set based on clustering results, leading to significantly smaller results than the actual wetland extent. Nevertheless, this work provides insights for extracting wetland sample points. Wetland inundation ranges validated for accuracy and consistency can greatly reduce manual and time costs for sample point extraction.

## Tools and Environments

The complete data processing, modeling, classification, statistical analysis, and data visualization were conducted in environments such as Google Earth Engine remote sensing cloud platform, ArcGIS, R, Origin, and Python (version 3.9). A substantial portion of the experimental work was performed on Google Earth Engine. Notably, the experiment utilizing the Copernicus DEM GLO-30 dataset to depict surface depressions was conducted in Python using the lidar library's depression algorithm (Wu Qiusheng).

