# 参与开发

开发环境见 [README](README.md)。提交采用 `<type>[可选范围]: <中文简短描述>`，例如 `fix(template): 修正标题为空时的分隔符`。

修改后运行类型检查与相关测试：

```powershell
npm run verify
npm run test:ui
cargo test --manifest-path src-tauri/Cargo.toml
```

UI 测试使用 Windows 系统 Microsoft Edge。各项检查通过后再构建便携包。

前端格式化使用 `npm run format`，Rust 使用 `cargo fmt --manifest-path src-tauri/Cargo.toml`。核心行为的修改应补充测试；数据格式变更需要提供迁移方式。

提交前检查差异，保留源码、测试和依赖锁文件，排除个人资料、环境配置和生成产物。
