import { ManagedInstanceForm } from '../components/ManagedInstanceForm';

export function CreateMinecraftServer() {
  return (
    <ManagedInstanceForm
      kind="minecraft"
      title="添加 Minecraft 托管实例"
      description="绑定一个已有 MC Java 服务端目录，填写启动命令和关闭命令。这里不生成 server.properties、不写 EULA、不复制 jar。"
      submitLabel="保存实例"
    />
  );
}
