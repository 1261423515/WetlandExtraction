import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier

# 读取数据
data_path = r'D:\lky\中科院\长时序湿地\实验图表\特征优选\OOB\最新\oob.xls'
df = pd.read_excel(data_path)

# 分割特征和目标变量
X = df.iloc[:, 1:]  # 特征
y = df.iloc[:, 0]  # 目标变量

# 将数据分为训练集和测试集
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# 创建随机森林分类器
rf_classifier = RandomForestClassifier(n_estimators=100, oob_score=True, random_state=42)

# 训练模型
rf_classifier.fit(X_train, y_train)

# 将初始的袋外正确率设为0
initial_oob_score = 0
print("初始的袋外正确率:", initial_oob_score)

# 获取特征重要性排序
feature_importances = rf_classifier.feature_importances_
feature_importance_df = pd.DataFrame({'Feature': X.columns, 'Importance': feature_importances})
sorted_features = feature_importance_df.sort_values(by='Importance', ascending=False)['Feature']

# 逐步添加特征并观察袋外正确率变化
selected_features = []
max_oob_score = initial_oob_score
for feature in sorted_features:
    selected_features.append(feature)
    X_train_selected = X_train[selected_features]
    X_test_selected = X_test[selected_features]

    # 重新训练模型
    rf_classifier.fit(X_train_selected, y_train)

    # 计算袋外正确率
    oob_score = rf_classifier.oob_score_
    print("当前加入特征 {} 后的袋外正确率: {:.4f}".format(feature, oob_score))

    # 如果袋外正确率下降或波动，继续添加特征
    if oob_score < max_oob_score:
        print("加入特征 {} 后的袋外正确率下降或波动，继续添加特征".format(feature))
    else:
        max_oob_score = oob_score

print("最终选择的特征集合:", selected_features)
