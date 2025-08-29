# CI/CD Pipeline 部署选项

## 概述

我们提供了两种CI/CD pipeline配置选项：

1. **GitHub Source** - 连接外部GitHub仓库
2. **CodeCommit Source** - 使用AWS内部的CodeCommit仓库

## 选项1：GitHub Source（推荐）

### 优点
- ✅ 使用现有的GitHub仓库 `https://github.com/microseg/MaterialRecognitionService.git`
- ✅ 不需要迁移代码
- ✅ 保持现有的GitHub工作流程

### 缺点
- ❌ 需要配置GitHub Personal Access Token
- ❌ 依赖外部GitHub服务

### 部署步骤

1. **配置GitHub Token**
   ```bash
   # 按照 GITHUB_SETUP.md 的说明创建token
   aws secretsmanager create-secret \
     --name "github-token" \
     --description "GitHub Personal Access Token for CI/CD Pipeline" \
     --secret-string "YOUR_GITHUB_TOKEN"
   ```

2. **部署基础设施**
   ```bash
   npm run build
   npm run deploy
   ```

3. **验证Pipeline**
   ```bash
   # 检查pipeline状态
   npm run pipeline-status
   ```

## 选项2：CodeCommit Source（备选）

### 优点
- ✅ 完全在AWS内部，无需外部依赖
- ✅ 无需配置GitHub token
- ✅ 更好的AWS集成

### 缺点
- ❌ 需要将代码迁移到CodeCommit
- ❌ 需要重新配置Git工作流程

### 部署步骤

1. **切换到CodeCommit版本**
   ```bash
   # 备份当前文件
   cp lib/recog-backend-stack.ts lib/recog-backend-stack-github.ts
   
   # 使用CodeCommit版本
   cp lib/recog-backend-stack-codecommit.ts lib/recog-backend-stack.ts
   ```

2. **部署基础设施**
   ```bash
   npm run build
   npm run deploy
   ```

3. **迁移代码到CodeCommit**
   ```bash
   # 获取CodeCommit仓库URL
   aws codecommit get-repository --repository-name MaterialRecognitionService
   
   # 克隆GitHub仓库
   git clone https://github.com/microseg/MaterialRecognitionService.git
   cd MaterialRecognitionService
   
   # 添加CodeCommit远程仓库
   git remote add codecommit [CODECOMMIT_URL]
   
   # 推送代码到CodeCommit
   git push codecommit master:main
   ```

## 推荐方案

### 如果您想继续使用GitHub：
选择 **选项1：GitHub Source**

### 如果您遇到GitHub连接问题：
选择 **选项2：CodeCommit Source**

## 故障排除

### GitHub连接问题
```bash
# 检查token是否配置正确
aws secretsmanager get-secret-value --secret-id "github-token"

# 检查pipeline状态
aws codepipeline get-pipeline-state --name MatsightDeployPipeline
```

### CodeCommit连接问题
```bash
# 检查CodeCommit仓库是否存在
aws codecommit list-repositories --query "repositories[?repositoryName=='MaterialRecognitionService']"

# 检查pipeline状态
aws codepipeline get-pipeline-state --name MatsightDeployPipeline
```

## 切换方案

如果您想从GitHub切换到CodeCommit（或反之）：

1. **备份当前配置**
   ```bash
   cp lib/recog-backend-stack.ts lib/recog-backend-stack-backup.ts
   ```

2. **切换配置文件**
   ```bash
   # 从GitHub切换到CodeCommit
   cp lib/recog-backend-stack-codecommit.ts lib/recog-backend-stack.ts
   
   # 或从CodeCommit切换到GitHub
   cp lib/recog-backend-stack-github.ts lib/recog-backend-stack.ts
   ```

3. **重新部署**
   ```bash
   npm run build
   npm run deploy
   ```

---

**最后更新**: 2025-01-28
**版本**: 1.0
