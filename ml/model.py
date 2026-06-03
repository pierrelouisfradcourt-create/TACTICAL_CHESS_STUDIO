import torch
import torch.nn as nn

from move_vocab import INDEX_TO_MOVE


VOCAB_SIZE = len(INDEX_TO_MOVE)
INPUT_CHANNELS = 15


class ResidualBlock(nn.Module):
    def __init__(self, channels: int):
        super().__init__()
        self.conv1 = nn.Conv2d(channels, channels, kernel_size=3, padding=1, bias=False)
        self.bn1 = nn.BatchNorm2d(channels)
        self.relu = nn.ReLU(inplace=True)
        self.conv2 = nn.Conv2d(channels, channels, kernel_size=3, padding=1, bias=False)
        self.bn2 = nn.BatchNorm2d(channels)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        residual = x
        out = self.conv1(x)
        out = self.bn1(out)
        out = self.relu(out)
        out = self.conv2(out)
        out = self.bn2(out)
        out = out + residual
        out = self.relu(out)
        return out


class PolicyValueNet(nn.Module):
    def __init__(self, dropout: float = 0.0):
        super().__init__()

        channels = 64

        self.stem = nn.Sequential(
            nn.Conv2d(INPUT_CHANNELS, channels, kernel_size=3, padding=1, bias=False),
            nn.BatchNorm2d(channels),
            nn.ReLU(inplace=True),
        )

        self.backbone = nn.Sequential(
            ResidualBlock(channels),
            ResidualBlock(channels),
            ResidualBlock(channels),
            ResidualBlock(channels),
        )

        # Policy head
        self.policy_head = nn.Sequential(
            nn.Conv2d(channels, 32, kernel_size=1, bias=False),
            nn.BatchNorm2d(32),
            nn.ReLU(inplace=True),
        )
        self.policy_drop = nn.Dropout(p=dropout)
        self.policy_fc = nn.Linear(32 * 8 * 8, VOCAB_SIZE)

        # Value head
        self.value_head = nn.Sequential(
            nn.Conv2d(channels, 32, kernel_size=1, bias=False),
            nn.BatchNorm2d(32),
            nn.ReLU(inplace=True),
        )
        self.value_drop = nn.Dropout(p=dropout)
        self.value_fc1 = nn.Linear(32 * 8 * 8, 64)
        self.value_fc2 = nn.Linear(64, 1)

    def forward(self, x: torch.Tensor):
        x = self.stem(x)
        x = self.backbone(x)

        p = self.policy_head(x)
        p = p.view(p.size(0), -1)
        p = self.policy_drop(p)
        p = self.policy_fc(p)

        v = self.value_head(x)
        v = v.view(v.size(0), -1)
        v = self.value_drop(v)
        v = torch.relu(self.value_fc1(v))
        v = torch.tanh(self.value_fc2(v))

        return p, v