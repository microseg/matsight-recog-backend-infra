# GitHub Token Setup for CI/CD Pipeline

## 概述

为了连接GitHub仓库 `https://github.com/microseg/MaterialRecognitionService.git`，我们需要配置GitHub Personal Access Token。

## 步骤1：创建GitHub Personal Access Token

1. **登录GitHub**
   - 访问 https://github.com
   - 登录您的账户

2. **创建Personal Access Token**
   - 点击右上角头像 → Settings
   - 左侧菜单选择 "Developer settings"
   - 选择 "Personal access tokens" → "Tokens (classic)"
   - 点击 "Generate new token" → "Generate new token (classic)"

3. **配置Token权限**
   - **Note**: `Matsight-CI-CD-Token`
   - **Expiration**: 选择合适的时间（建议90天或更长）
   - **Scopes**: 选择以下权限：
     - ✅ `repo` (Full control of private repositories)
     - ✅ `admin:repo_hook` (Full control of repository hooks)

4. **生成Token**
   - 点击 "Generate token"
   - **重要**: 复制并保存token（只显示一次！）

## 步骤2：配置AWS Secrets Manager

### 方法1：使用AWS CLI
```bash
# 将YOUR_GITHUB_TOKEN替换为实际的token
aws secretsmanager create-secret \
  --name "github-token" \
  --description "GitHub Personal Access Token for CI/CD Pipeline" \
  --secret-string "YOUR_GITHUB_TOKEN"
```

### 方法2：使用AWS控制台
1. 打开AWS控制台
2. 进入Secrets Manager服务
3. 点击 "Store a new secret"
4. 选择 "Other type of secret"
5. 在 "Plaintext" 中输入您的GitHub token
6. Secret name: `github-token`
7. 点击 "Next" → "Next" → "Store"

## 步骤3：验证配置

```bash
# 测试token是否配置正确
aws secretsmanager get-secret-value --secret-id "github-token"
```

## 步骤4：重新部署基础设施

```bash
# 构建和部署
npm run build
npm run deploy
```

## 故障排除

### 问题1：Token权限不足
**症状**: Pipeline无法访问GitHub仓库
**解决**: 确保token有 `repo` 权限

### 问题2：Token过期
**症状**: Pipeline突然停止工作
**解决**: 重新生成token并更新Secrets Manager

### 问题3：仓库不存在
**症状**: Pipeline无法找到仓库
**解决**: 确认仓库URL和分支名称正确

## 安全注意事项

1. **Token安全**: 不要将token提交到代码仓库
2. **权限最小化**: 只授予必要的权限
3. **定期轮换**: 定期更新token
4. **监控使用**: 监控token的使用情况

## 替代方案：使用CodeCommit

如果GitHub连接有问题，我们可以使用AWS CodeCommit：

```bash
# 创建CodeCommit仓库
aws codecommit create-repository --repository-name MaterialRecognitionService

# 获取仓库URL
aws codecommit get-repository --repository-name MaterialRecognitionService
```

然后修改CDK代码使用CodeCommit source action。

---

**最后更新**: 2025-01-28
**版本**: 1.0
