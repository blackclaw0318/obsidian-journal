# 推送备忘 (老板专属)

## 当前 remote 配置

本仓库 remote 是 **HTTPS** (不是 SSH), 因为老板的 SSH key 是 stellar-scribe 的 deploy key,
不能用于 obsidian-journal。

```
origin = https://github.com/blackclaw0318/obsidian-journal.git
```

## 下次 push (老板自己操作)

### 方案 A: 临时 PAT (推荐, 简单)

```bash
# 在 GitHub 生成新 PAT (fine-grained, 只勾 obsidian-journal 仓库 + Contents: Read & write)
export GH_TOKEN=ghp_xxx
git -c credential.helper="!f() { echo username=x-access-token; echo password=$GH_TOKEN; }; f" push
```

### 方案 B: 长期 PAT + git credential store

```bash
# 1. 一次性输入 PAT, 系统记住
git push  # 第一次会提示输入 username (blackclaw0318) 和 PAT

# 或手动写入 ~/.git-credentials
echo "https://blackclaw0318:ghp_xxx@github.com" > ~/.git-credentials
git config --global credential.helper store
```

### 方案 C: 给 obsidian-journal 加专用 SSH key

```bash
ssh-keygen -t ed25519 -C "hei@obsidian-journal" -f ~/.ssh/id_ed25519_obsidian
# 把 ~/.ssh/id_ed25519_obsidian.pub 加到 GitHub (Settings → SSH keys)
# 写入 ~/.ssh/config:
cat >> ~/.ssh/config <<'CFG'
Host github-oj
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_ed25519_obsidian
    IdentitiesOnly yes
CFG
# 改 remote
git remote set-url origin git@github-oj:blackclaw0318/obsidian-journal.git
```

> ⚠️ **凭据安全协议 (黑视角)**: 永远不要把 PAT 写进 commit 文件。
> 本文件只描述 push 流程, 不含真实 PAT。
