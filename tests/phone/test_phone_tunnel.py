import importlib.util
import io
import json
from pathlib import Path
import unittest
from types import SimpleNamespace
from unittest.mock import Mock, patch

spec = importlib.util.spec_from_file_location(
    "phone_tunnel", Path(__file__).resolve().parents[2] / "scripts" / "phone-tunnel.py")
tunnel = importlib.util.module_from_spec(spec)
spec.loader.exec_module(tunnel)


class PhoneTunnelTests(unittest.TestCase):
    def test_health_requires_pedroos_response(self):
        for payload, expected in [({"status": "ok", "os": "PedroOS 95"}, True),
                                  ({"status": "ok"}, False), ({}, False), ([], False)]:
            with patch.object(tunnel, "urlopen", return_value=io.BytesIO(json.dumps(payload).encode())):
                self.assertEqual(tunnel.healthy("http://localhost:8080"), expected)
        with patch.object(tunnel, "urlopen", side_effect=OSError("offline")):
            self.assertFalse(tunnel.healthy("http://localhost:8080"))

    def test_publish_updates_only_tunnel_file_and_keeps_token_out_of_content(self):
        with patch.object(tunnel, "urlopen", return_value=io.BytesIO(b"{}")) as send:
            tunnel.publish("https://new.trycloudflare.com", "private-token", tunnel.GIST_ID)
        request = send.call_args.args[0]
        self.assertEqual(request.method, "PATCH")
        self.assertEqual(request.get_header("Authorization"), "Bearer private-token")
        body = json.loads(request.data)
        self.assertEqual(list(body["files"]), ["pedroos-tunnel.json"])
        info = json.loads(body["files"]["pedroos-tunnel.json"]["content"])
        self.assertEqual(info["url"], "https://new.trycloudflare.com")
        self.assertIn("updatedAt", info)
        self.assertNotIn(b"private-token", request.data)

    def test_restart_registers_each_new_healthy_tunnel(self):
        args = SimpleNamespace(cloudflared="cloudflared", origin="http://127.0.0.1:8080", gist=tunnel.GIST_ID)
        with patch.object(tunnel, "publish") as publish, patch.object(tunnel, "healthy", return_value=True):
            for url in ["https://first.trycloudflare.com", "https://second.trycloudflare.com"]:
                process = Mock(stdout=io.StringIO("Tunnel created at " + url + "\n"))
                process.poll.side_effect = [None, 0, 0]
                with patch.object(tunnel.subprocess, "Popen", return_value=process):
                    tunnel.run_tunnel(args, "private-token")
            self.assertEqual([call.args[0] for call in publish.call_args_list],
                             ["https://first.trycloudflare.com", "https://second.trycloudflare.com"])

    def test_unhealthy_tunnel_is_not_registered(self):
        args = SimpleNamespace(cloudflared="cloudflared", origin="http://127.0.0.1:8080", gist=tunnel.GIST_ID)
        process = Mock(stdout=io.StringIO("https://broken.trycloudflare.com\n"))
        process.poll.side_effect = [None, 0, 0]
        with patch.object(tunnel.subprocess, "Popen", return_value=process), \
                patch.object(tunnel, "healthy", return_value=False), patch.object(tunnel, "publish") as publish:
            tunnel.run_tunnel(args, "private-token")
            publish.assert_not_called()


if __name__ == "__main__":
    unittest.main()
