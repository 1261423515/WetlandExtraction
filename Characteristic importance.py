import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier

# 读取数据
data_path = r'D:\lky\中科院\长时序湿地\实验图表\特征优选\OOB\最新\oob.xls'
df = pd.read_excel(data_path)

# 分割特征和目标变量
X = df.iloc[:, 1:]  # 特征
y = df.iloc[:, 0]   # 目标变量

# 将数据分为训练集和测试集
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# 创建随机森林分类器
rf_classifier = RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42)

# 训练模型
rf_classifier.fit(X_train, y_train)

# 获取特征重要性
feature_importances = rf_classifier.feature_importances_
feature_importance_df = pd.DataFrame({'Feature': X.columns, 'Importance': feature_importances})
print("特征重要性：")
print(feature_importance_df)

# 定义保存路径
output_path = r'D:\lky\中科院\长时序湿地\实验图表\特征优选\OOB\最新\重要性2.xls'

# 将DataFrame保存为Excel文件
feature_importance_df.to_excel(output_path, index=False)

print("特征重要性已保存到:", output_path)
