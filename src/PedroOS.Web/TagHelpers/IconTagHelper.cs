using Microsoft.AspNetCore.Razor.TagHelpers;
using PedroOS.Web.Services;

namespace PedroOS.Web.TagHelpers;

[HtmlTargetElement("os-icon")]
public sealed class IconTagHelper(IIconRegistry icons) : TagHelper
{
    public string Key { get; set; } = "exe";
    public int Size { get; set; } = 32;
    public string Alt { get; set; } = "";

    public override void Process(TagHelperContext context, TagHelperOutput output)
    {
        var size = Size <= 16 ? 16 : Size <= 32 ? 32 : 48;
        output.TagName = "img";
        output.TagMode = TagMode.SelfClosing;
        output.Attributes.SetAttribute("src", icons.GetPath(Key, size));
        output.Attributes.SetAttribute("width", size);
        output.Attributes.SetAttribute("height", size);
        output.Attributes.SetAttribute("alt", Alt);
        output.Attributes.SetAttribute("draggable", "false");
        var classes = output.Attributes["class"]?.Value?.ToString();
        output.Attributes.SetAttribute("class", $"pixel-icon {classes}".Trim());
    }
}
