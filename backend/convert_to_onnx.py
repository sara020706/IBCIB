import os
import json
import torch
from huggingface_hub import hf_hub_download
import torchvision.models as tv_models

HF_REPO_ID = "ujjwal75/indian-bovine-breeds-model"
HF_MODEL_FILE = "Indian_bovine_finetuned_model.pth"
HF_CLASSES_FILE = "classes.json"

def main():
    print(f"Downloading model and classes from {HF_REPO_ID}...")
    model_path = hf_hub_download(HF_REPO_ID, HF_MODEL_FILE)
    classes_path = hf_hub_download(HF_REPO_ID, HF_CLASSES_FILE)

    with open(classes_path, "r") as f:
        CLASS_NAMES = json.load(f)
    
    num_classes = len(CLASS_NAMES)
    print(f"Loaded {num_classes} classes.")

    import traceback
    # Try different architectures since ResNet50 failed
    architectures = [
        tv_models.convnext_tiny,
        tv_models.convnext_small,
        tv_models.convnext_base,
        tv_models.resnet50
    ]
    
    net = None
    state = torch.load(model_path, map_location="cpu", weights_only=True)
    state_dict = state.get("model_state_dict", state)
    
    for arch in architectures:
        try:
            print(f"Trying architecture {arch.__name__}...")
            temp_net = arch(num_classes=num_classes)
            temp_net.load_state_dict(state_dict)
            net = temp_net
            print(f"Success! Model is {arch.__name__}")
            break
        except Exception as e:
            pass
            
    if net is None:
        raise RuntimeError("Could not find matching architecture for the state dict!")
        
    net.eval()
    
    # Export to ONNX
    onnx_filename = "Indian_bovine_finetuned_model.onnx"
    print(f"Exporting model to {onnx_filename}...")
    
    dummy_input = torch.randn(1, 3, 224, 224, requires_grad=True)
    
    torch.onnx.export(
        net,
        dummy_input,
        onnx_filename,
        export_params=True,
        opset_version=14,
        do_constant_folding=True,
        input_names=['input'],
        output_names=['output'],
        dynamic_axes={'input': {0: 'batch_size'}, 'output': {0: 'batch_size'}}
    )
    
    print(f"Success! Model saved to {onnx_filename} in the current directory.")
    print(f"File size: {os.path.getsize(onnx_filename) / (1024 * 1024):.2f} MB")

if __name__ == "__main__":
    main()
