import { useNavigate } from "react-router-dom";
import { Form, Input, Button, Switch, Card, message } from "antd";
import BasicLayout from "@/layouts/BasicLayout";
import { createPost } from "@/services/post";

const PostNewPage = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const handleSubmit = async (values: { title: string; content?: string; published: boolean }) => {
    await createPost({
      title: values.title,
      content: values.content,
      published: values.published ?? false,
    });
    message.success("创建成功");
    navigate("/posts");
  };

  return (
    <BasicLayout>
      <Card title="新建文章" className="max-w-2xl">
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ published: false }}
        >
          <Form.Item
            name="title"
            label="标题"
            rules={[{ required: true, message: "请输入标题" }]}
          >
            <Input placeholder="文章标题" size="large" />
          </Form.Item>
          <Form.Item name="content" label="内容">
            <Input.TextArea rows={8} placeholder="文章内容" />
          </Form.Item>
          <Form.Item name="published" label="发布" valuePropName="checked">
            <Switch checkedChildren="已发布" unCheckedChildren="草稿" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" size="large">
              创建
            </Button>
            <Button className="ml-3" onClick={() => navigate("/posts")}>
              取消
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </BasicLayout>
  );
};

export default PostNewPage;
