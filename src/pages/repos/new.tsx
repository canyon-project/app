import { useNavigate } from "react-router-dom";
import { Form, Input, Button, Card, message } from "antd";
import BasicLayout from "@/layouts/BasicLayout";
import { createRepo } from "@/services/repo";

const RepoNewPage = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const handleSubmit = async (values: {
    provider: string;
    pathWithNamespace: string;
    description?: string;
    config?: string;
    bu?: string;
  }) => {
    await createRepo({
      provider: values.provider,
      pathWithNamespace: values.pathWithNamespace,
      description: values.description,
      config: values.config,
      bu: values.bu,
    });
    message.success("创建成功");
    navigate("/repos");
  };

  return (
    <BasicLayout>
      <Card title="新建仓库" className="max-w-2xl">
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="provider"
            label="Provider"
            rules={[{ required: true, message: "请输入 provider（如 gitlab、github）" }]}
          >
            <Input placeholder="gitlab / github" size="large" />
          </Form.Item>
          <Form.Item
            name="pathWithNamespace"
            label="路径（owner/repo）"
            rules={[{ required: true, message: "请输入 pathWithNamespace" }]}
          >
            <Input placeholder="owner/repo-name" size="large" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} placeholder="仓库描述" />
          </Form.Item>
          <Form.Item name="config" label="Config">
            <Input.TextArea rows={4} placeholder="配置（JSON 等）" />
          </Form.Item>
          <Form.Item name="bu" label="BU">
            <Input placeholder="业务单元" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" size="large">
              创建
            </Button>
            <Button className="ml-3" onClick={() => navigate("/repos")}>
              取消
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </BasicLayout>
  );
};

export default RepoNewPage;
